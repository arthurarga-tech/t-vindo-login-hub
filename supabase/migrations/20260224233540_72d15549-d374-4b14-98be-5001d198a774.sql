
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

  -- Delete orders BEFORE tables (orders.table_id references tables.id)
  DELETE FROM orders WHERE customer_id = p_customer_id;

  -- Now safe to delete tables
  DELETE FROM tables WHERE customer_id = p_customer_id;

  -- Delete customer
  DELETE FROM customers WHERE id = p_customer_id;
END;
$$;
