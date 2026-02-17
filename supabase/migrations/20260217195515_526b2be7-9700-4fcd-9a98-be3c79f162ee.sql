
-- Function to get counts of records related to a customer before deletion
CREATE OR REPLACE FUNCTION public.get_customer_delete_counts(p_customer_id uuid)
RETURNS TABLE(order_count bigint, order_item_count bigint, financial_transaction_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is owner/member of the customer's establishment
  IF NOT EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = p_customer_id
      AND (is_establishment_owner(auth.uid(), c.establishment_id) OR is_establishment_member(auth.uid(), c.establishment_id))
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM orders WHERE customer_id = p_customer_id)::bigint AS order_count,
    (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.customer_id = p_customer_id)::bigint AS order_item_count,
    (SELECT COUNT(*) FROM financial_transactions ft JOIN orders o ON o.id = ft.order_id WHERE o.customer_id = p_customer_id)::bigint AS financial_transaction_count;
END;
$$;

-- Function to cascade delete a customer and all related records
CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_establishment_id uuid;
BEGIN
  -- Verify caller is owner/member
  SELECT c.establishment_id INTO v_establishment_id
  FROM customers c
  WHERE c.id = p_customer_id
    AND (is_establishment_owner(auth.uid(), c.establishment_id) OR is_establishment_member(auth.uid(), c.establishment_id));

  IF v_establishment_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized or customer not found';
  END IF;

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

  -- Delete order status history
  DELETE FROM order_status_history
  WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- Delete orders
  DELETE FROM orders WHERE customer_id = p_customer_id;

  -- Delete customer
  DELETE FROM customers WHERE id = p_customer_id;
END;
$$;
