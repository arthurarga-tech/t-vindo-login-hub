
-- =====================================================
-- Fix 1: delete_customer_cascade - disable trigger during cascade delete
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_customer_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_establishment_id uuid;
BEGIN
  SELECT c.establishment_id INTO v_establishment_id
  FROM customers c
  WHERE c.id = p_customer_id
    AND (is_establishment_owner(auth.uid(), c.establishment_id) OR is_establishment_member(auth.uid(), c.establishment_id));

  IF v_establishment_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized or customer not found';
  END IF;

  -- Temporarily disable the immutability trigger
  ALTER TABLE order_items DISABLE TRIGGER prevent_confirmed_order_edit;

  -- Delete financial transactions linked to this customer's orders
  DELETE FROM financial_transactions
  WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- Delete order item addons
  DELETE FROM order_item_addons
  WHERE order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.customer_id = p_customer_id
  );

  -- Delete order items
  DELETE FROM order_items
  WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- Re-enable the trigger
  ALTER TABLE order_items ENABLE TRIGGER prevent_confirmed_order_edit;

  -- Delete order status history
  DELETE FROM order_status_history
  WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- Delete table payments for tables linked to this customer
  DELETE FROM table_payments
  WHERE table_id IN (SELECT id FROM tables WHERE customer_id = p_customer_id);

  -- Delete tables linked to this customer
  DELETE FROM tables WHERE customer_id = p_customer_id;

  -- Delete orders
  DELETE FROM orders WHERE customer_id = p_customer_id;

  -- Delete customer
  DELETE FROM customers WHERE id = p_customer_id;
END;
$$;

-- =====================================================
-- Fix 2: log_order_as_transaction - skip table orders (close_table handles finance)
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_order_as_transaction()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_category_id uuid;
  v_credit_fee numeric;
  v_debit_fee numeric;
  v_fee_amount numeric := 0;
  v_net_amount numeric;
  v_payment_method text;
BEGIN
  IF NEW.status IN ('delivered', 'picked_up', 'served') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'picked_up', 'served')) THEN
    
    -- Skip table orders - close_table manages their financial transactions
    IF NEW.table_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    IF auth.uid() IS NOT NULL AND 
       NOT (is_establishment_owner(auth.uid(), NEW.establishment_id) OR 
            is_establishment_member(auth.uid(), NEW.establishment_id)) THEN
      RAISE EXCEPTION 'Unauthorized: not a member of this establishment';
    END IF;
    
    SELECT id INTO v_category_id
    FROM financial_categories
    WHERE establishment_id = NEW.establishment_id
      AND name = 'Vendas'
      AND type = 'income'
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
      PERFORM create_default_financial_categories(NEW.establishment_id);
      SELECT id INTO v_category_id
      FROM financial_categories
      WHERE establishment_id = NEW.establishment_id
        AND name = 'Vendas'
        AND type = 'income'
      LIMIT 1;
    END IF;
    
    SELECT card_credit_fee, card_debit_fee 
    INTO v_credit_fee, v_debit_fee
    FROM establishments
    WHERE id = NEW.establishment_id;
    
    v_payment_method := NEW.payment_method;
    IF v_payment_method = 'credit' THEN
      v_fee_amount := NEW.total * (COALESCE(v_credit_fee, 0) / 100);
    ELSIF v_payment_method = 'debit' THEN
      v_fee_amount := NEW.total * (COALESCE(v_debit_fee, 0) / 100);
    END IF;
    
    v_net_amount := NEW.total - v_fee_amount;
    
    INSERT INTO financial_transactions (
      establishment_id, category_id, order_id, type,
      gross_amount, fee_amount, net_amount, payment_method,
      description, transaction_date
    ) VALUES (
      NEW.establishment_id, v_category_id, NEW.id, 'income',
      NEW.total, v_fee_amount, v_net_amount, v_payment_method,
      'Pedido #' || NEW.order_number,
      now()::date
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- Fix 3: create_table_order RPC - create new order linked to existing table
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_table_order(
  p_table_id uuid,
  p_items jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_table record;
  v_order_id uuid;
  v_order_number int;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_item_total numeric;
  v_inserted_id uuid;
  v_addon jsonb;
  v_result json;
BEGIN
  -- Get table info
  SELECT * INTO v_table FROM tables WHERE id = p_table_id AND status = 'open';
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Table not found or not open';
  END IF;

  -- Verify caller has access
  IF NOT (is_establishment_owner(auth.uid(), v_table.establishment_id) OR
          is_establishment_member(auth.uid(), v_table.establishment_id)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate subtotal from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_total := (v_item->>'product_price')::numeric * (v_item->>'quantity')::int;
    -- Add addon prices
    IF v_item->'addons' IS NOT NULL AND jsonb_array_length(v_item->'addons') > 0 THEN
      FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'addons')
      LOOP
        v_item_total := v_item_total + ((v_addon->>'price')::numeric * (v_addon->>'quantity')::int) * (v_item->>'quantity')::int;
      END LOOP;
    END IF;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- Create the order
  INSERT INTO orders (
    establishment_id, customer_id, payment_method, order_type,
    subtotal, delivery_fee, total, status,
    table_id, table_number, is_open_tab, order_subtype,
    customer_display_name
  ) VALUES (
    v_table.establishment_id,
    v_table.customer_id,
    'pending',
    'dine_in',
    v_subtotal,
    0,
    v_subtotal,
    'pending',
    p_table_id,
    v_table.table_number,
    true,
    'table',
    v_table.customer_display_name
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- Add status history
  INSERT INTO order_status_history (order_id, status) VALUES (v_order_id, 'pending');

  -- Create order items and their addons
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_total := (v_item->>'product_price')::numeric * (v_item->>'quantity')::int;
    IF v_item->'addons' IS NOT NULL AND jsonb_array_length(v_item->'addons') > 0 THEN
      FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'addons')
      LOOP
        v_item_total := v_item_total + ((v_addon->>'price')::numeric * (v_addon->>'quantity')::int) * (v_item->>'quantity')::int;
      END LOOP;
    END IF;

    INSERT INTO order_items (
      order_id, product_id, product_name, product_price, quantity, total, observation
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'product_price')::numeric,
      (v_item->>'quantity')::int,
      v_item_total,
      v_item->>'observation'
    )
    RETURNING id INTO v_inserted_id;

    -- Create addons for this item
    IF v_item->'addons' IS NOT NULL AND jsonb_array_length(v_item->'addons') > 0 THEN
      FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'addons')
      LOOP
        INSERT INTO order_item_addons (
          order_item_id, addon_id, addon_name, addon_price, quantity
        ) VALUES (
          v_inserted_id,
          (v_addon->>'id')::uuid,
          v_addon->>'name',
          (v_addon->>'price')::numeric,
          (v_addon->>'quantity')::int
        );
      END LOOP;
    END IF;
  END LOOP;

  SELECT json_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total', v_subtotal
  ) INTO v_result;

  RETURN v_result;
END;
$$;
