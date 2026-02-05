
-- Fix: use now()::date instead of NEW.created_at::date for transaction_date
-- This ensures financial transactions are recorded on the closing date, not the opening date
CREATE OR REPLACE FUNCTION public.log_order_as_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
