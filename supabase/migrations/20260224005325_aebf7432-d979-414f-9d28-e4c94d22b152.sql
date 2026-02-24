
-- =============================================
-- 1. Tabela TABLES (Mesas como entidade independente)
-- =============================================
CREATE TABLE public.tables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id),
  table_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  customer_display_name text,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 2. Tabela TABLE_PAYMENTS (Múltiplos pagamentos)
-- =============================================
CREATE TABLE public.table_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id uuid NOT NULL REFERENCES public.tables(id),
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 3. Alterar ORDERS: adicionar table_id
-- =============================================
ALTER TABLE public.orders ADD COLUMN table_id uuid REFERENCES public.tables(id);

-- =============================================
-- 4. Alterar ORDER_ITEMS: adicionar item_status
-- =============================================
ALTER TABLE public.order_items ADD COLUMN item_status text NOT NULL DEFAULT 'pending';

-- =============================================
-- 5. RLS para TABLES
-- =============================================
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tables"
  ON public.tables FOR SELECT
  USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can create tables"
  ON public.tables FOR INSERT
  WITH CHECK (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can update tables"
  ON public.tables FOR UPDATE
  USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can delete tables"
  ON public.tables FOR DELETE
  USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- =============================================
-- 6. RLS para TABLE_PAYMENTS
-- =============================================
ALTER TABLE public.table_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view table payments"
  ON public.table_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tables t
    WHERE t.id = table_payments.table_id
      AND (is_establishment_member(auth.uid(), t.establishment_id) OR is_establishment_owner(auth.uid(), t.establishment_id))
  ));

CREATE POLICY "Members can create table payments"
  ON public.table_payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tables t
    WHERE t.id = table_payments.table_id
      AND (is_establishment_member(auth.uid(), t.establishment_id) OR is_establishment_owner(auth.uid(), t.establishment_id))
  ));

-- =============================================
-- 7. Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;

-- =============================================
-- 8. Trigger: Pedido imutável após confirmação
-- Bloqueia INSERT/UPDATE/DELETE em order_items quando o pedido não está em 'pending'
-- Exceção: UPDATE apenas do campo item_status
-- =============================================
CREATE OR REPLACE FUNCTION public.prevent_confirmed_order_edit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_order_status text;
BEGIN
  -- For DELETE, use OLD; for INSERT/UPDATE, use NEW (or OLD for the order_id)
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_order_status FROM orders WHERE id = OLD.order_id;
  ELSE
    SELECT status INTO v_order_status FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  END IF;

  -- Allow changes only if order is pending
  IF v_order_status != 'pending' THEN
    -- Exception: allow updating item_status only
    IF TG_OP = 'UPDATE' AND
       OLD.order_id = NEW.order_id AND
       OLD.product_id = NEW.product_id AND
       OLD.product_name = NEW.product_name AND
       OLD.product_price = NEW.product_price AND
       OLD.quantity = NEW.quantity AND
       OLD.total = NEW.total AND
       OLD.observation IS NOT DISTINCT FROM NEW.observation THEN
      -- Only item_status changed, allow it
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Cannot modify items of a confirmed order (status: %)', v_order_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER prevent_confirmed_order_edit
  BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_confirmed_order_edit();

-- =============================================
-- 9. Trigger: Auto-finalizar pedido quando todos os itens estão entregues
-- =============================================
CREATE OR REPLACE FUNCTION public.check_order_completion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_all_delivered boolean;
  v_order_status text;
BEGIN
  IF NEW.item_status = 'delivered' THEN
    SELECT status INTO v_order_status FROM orders WHERE id = NEW.order_id;
    
    -- Don't touch already finalized orders
    IF v_order_status IN ('served', 'delivered', 'picked_up', 'cancelled') THEN
      RETURN NEW;
    END IF;

    SELECT NOT EXISTS (
      SELECT 1 FROM order_items
      WHERE order_id = NEW.order_id AND item_status != 'delivered'
    ) INTO v_all_delivered;

    IF v_all_delivered THEN
      UPDATE orders SET status = 'served', updated_at = now() WHERE id = NEW.order_id;
      INSERT INTO order_status_history (order_id, status) VALUES (NEW.order_id, 'served');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_order_completion
  AFTER UPDATE ON public.order_items
  FOR EACH ROW
  WHEN (OLD.item_status IS DISTINCT FROM NEW.item_status)
  EXECUTE FUNCTION public.check_order_completion();

-- =============================================
-- 10. Função: Fechar mesa com múltiplos pagamentos
-- =============================================
CREATE OR REPLACE FUNCTION public.close_table(p_table_id uuid, p_payments jsonb)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_table record;
  v_total_consumed numeric;
  v_total_paid numeric := 0;
  v_payment jsonb;
  v_category_id uuid;
  v_credit_fee numeric;
  v_debit_fee numeric;
  v_fee_amount numeric;
  v_net_amount numeric;
  v_order record;
BEGIN
  -- Get table info
  SELECT * INTO v_table FROM tables WHERE id = p_table_id AND status = 'open';
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Table not found or already closed';
  END IF;

  -- Verify caller has access
  IF NOT (is_establishment_owner(auth.uid(), v_table.establishment_id) OR
          is_establishment_member(auth.uid(), v_table.establishment_id)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate total consumed from all non-cancelled orders
  SELECT COALESCE(SUM(total), 0) INTO v_total_consumed
  FROM orders
  WHERE table_id = p_table_id AND status != 'cancelled';

  -- Calculate total paid
  SELECT COALESCE(SUM((p->>'amount')::numeric), 0) INTO v_total_paid
  FROM jsonb_array_elements(p_payments) AS p;

  -- Validate totals match
  IF abs(v_total_paid - v_total_consumed) > 0.01 THEN
    RAISE EXCEPTION 'Payment total (%) does not match consumed total (%)', v_total_paid, v_total_consumed;
  END IF;

  -- Get fees config
  SELECT card_credit_fee, card_debit_fee INTO v_credit_fee, v_debit_fee
  FROM establishments WHERE id = v_table.establishment_id;

  -- Get income category
  SELECT id INTO v_category_id
  FROM financial_categories
  WHERE establishment_id = v_table.establishment_id AND name = 'Vendas' AND type = 'income'
  LIMIT 1;

  IF v_category_id IS NULL THEN
    PERFORM create_default_financial_categories(v_table.establishment_id);
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE establishment_id = v_table.establishment_id AND name = 'Vendas' AND type = 'income'
    LIMIT 1;
  END IF;

  -- Register each payment
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO table_payments (table_id, payment_method, amount)
    VALUES (p_table_id, v_payment->>'method', (v_payment->>'amount')::numeric);

    -- Calculate fees
    v_fee_amount := 0;
    IF (v_payment->>'method') = 'credit' THEN
      v_fee_amount := (v_payment->>'amount')::numeric * (COALESCE(v_credit_fee, 0) / 100);
    ELSIF (v_payment->>'method') = 'debit' THEN
      v_fee_amount := (v_payment->>'amount')::numeric * (COALESCE(v_debit_fee, 0) / 100);
    END IF;
    v_net_amount := (v_payment->>'amount')::numeric - v_fee_amount;

    -- Create financial transaction per payment method
    INSERT INTO financial_transactions (
      establishment_id, category_id, type, gross_amount, fee_amount, net_amount,
      payment_method, description, transaction_date
    ) VALUES (
      v_table.establishment_id, v_category_id, 'income',
      (v_payment->>'amount')::numeric, v_fee_amount, v_net_amount,
      v_payment->>'method',
      'Mesa ' || v_table.table_number,
      now()::date
    );
  END LOOP;

  -- Finalize all orders of this table
  FOR v_order IN
    SELECT id, status FROM orders WHERE table_id = p_table_id AND status != 'cancelled'
  LOOP
    IF v_order.status NOT IN ('served', 'delivered', 'picked_up') THEN
      UPDATE orders SET status = 'served', updated_at = now() WHERE id = v_order.id;
      INSERT INTO order_status_history (order_id, status) VALUES (v_order.id, 'served');
    END IF;
  END LOOP;

  -- Close the table
  UPDATE tables SET status = 'closed', closed_at = now(), updated_at = now()
  WHERE id = p_table_id;
END;
$$;

-- =============================================
-- 11. Updated_at trigger for tables
-- =============================================
CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 12. Migração de dados legados
-- =============================================

-- 12a. Mesas abertas (is_open_tab = true, order_subtype = 'table')
INSERT INTO public.tables (establishment_id, table_number, customer_id, customer_display_name, status, opened_at, notes)
SELECT 
  o.establishment_id,
  COALESCE(o.table_number, o.order_number::text),
  o.customer_id,
  o.customer_display_name,
  'open',
  o.created_at,
  o.notes
FROM orders o
WHERE o.order_subtype = 'table' AND o.is_open_tab = true AND o.status != 'cancelled';

-- Link orders to their new tables
UPDATE orders o
SET table_id = t.id
FROM tables t
WHERE o.order_subtype = 'table' 
  AND o.is_open_tab = true 
  AND o.status != 'cancelled'
  AND t.establishment_id = o.establishment_id
  AND t.table_number = COALESCE(o.table_number, o.order_number::text)
  AND t.status = 'open'
  AND t.opened_at = o.created_at;

-- 12b. Mesas fechadas (is_open_tab = false, order_subtype = 'table')
INSERT INTO public.tables (establishment_id, table_number, customer_id, customer_display_name, status, opened_at, closed_at, notes)
SELECT 
  o.establishment_id,
  COALESCE(o.table_number, o.order_number::text),
  o.customer_id,
  o.customer_display_name,
  'closed',
  o.created_at,
  o.updated_at,
  o.notes
FROM orders o
WHERE o.order_subtype = 'table' AND (o.is_open_tab = false OR o.is_open_tab IS NULL) AND o.status != 'cancelled'
  AND o.table_id IS NULL;

UPDATE orders o
SET table_id = t.id
FROM tables t
WHERE o.order_subtype = 'table'
  AND (o.is_open_tab = false OR o.is_open_tab IS NULL)
  AND o.status != 'cancelled'
  AND o.table_id IS NULL
  AND t.establishment_id = o.establishment_id
  AND t.table_number = COALESCE(o.table_number, o.order_number::text)
  AND t.status = 'closed'
  AND t.opened_at = o.created_at;

-- 12c. Item status para itens existentes
UPDATE order_items oi
SET item_status = CASE
  WHEN o.status IN ('served', 'delivered', 'picked_up', 'cancelled') THEN 'delivered'
  ELSE 'pending'
END
FROM orders o
WHERE oi.order_id = o.id;
