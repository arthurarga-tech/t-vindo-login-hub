
-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to auto-finalize orders older than 24h
CREATE OR REPLACE FUNCTION public.auto_finalize_old_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_order RECORD;
  v_final_status text;
  v_category_id uuid;
  v_credit_fee numeric;
  v_debit_fee numeric;
  v_fee_amount numeric;
  v_net_amount numeric;
BEGIN
  FOR v_order IN
    SELECT id, order_type, establishment_id, total, payment_method, order_number, status
    FROM orders
    WHERE status NOT IN ('delivered', 'picked_up', 'served', 'cancelled')
      AND created_at < (now() - interval '24 hours')
  LOOP
    -- Determine final status based on order type
    CASE v_order.order_type
      WHEN 'delivery' THEN v_final_status := 'delivered';
      WHEN 'pickup' THEN v_final_status := 'picked_up';
      WHEN 'dine_in' THEN v_final_status := 'served';
      ELSE v_final_status := 'delivered';
    END CASE;

    -- Update order status
    UPDATE orders
    SET status = v_final_status, updated_at = now()
    WHERE id = v_order.id;

    -- Add to status history
    INSERT INTO order_status_history (order_id, status)
    VALUES (v_order.id, v_final_status);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;
