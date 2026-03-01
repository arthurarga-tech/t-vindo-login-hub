
-- Update create_public_order to accept and store customer_display_name
CREATE OR REPLACE FUNCTION public.create_public_order(
  p_establishment_id uuid,
  p_customer_id uuid,
  p_payment_method text,
  p_order_type text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_notes text DEFAULT NULL,
  p_change_for numeric DEFAULT NULL,
  p_scheduled_for timestamptz DEFAULT NULL,
  p_customer_display_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_order_number int;
  v_result json;
  v_establishment record;
  v_day_of_week text;
  v_current_time time;
  v_open_time time;
  v_close_time time;
  v_day_hours jsonb;
  v_is_closed boolean;
  v_display_name text;
BEGIN
  SELECT id, temporary_closed, opening_hours, allow_scheduling
  INTO v_establishment
  FROM establishments
  WHERE id = p_establishment_id;

  IF v_establishment IS NULL THEN
    RAISE EXCEPTION 'Establishment not found';
  END IF;

  IF v_establishment.temporary_closed = true THEN
    RAISE EXCEPTION 'Store is temporarily closed';
  END IF;

  IF p_scheduled_for IS NULL AND v_establishment.opening_hours IS NOT NULL THEN
    v_day_of_week := lower(to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'day'));
    v_day_of_week := rtrim(v_day_of_week);
    v_day_of_week := CASE v_day_of_week
      WHEN 'sunday' THEN 'sunday'
      WHEN 'monday' THEN 'monday'
      WHEN 'tuesday' THEN 'tuesday'
      WHEN 'wednesday' THEN 'wednesday'
      WHEN 'thursday' THEN 'thursday'
      WHEN 'friday' THEN 'friday'
      WHEN 'saturday' THEN 'saturday'
      ELSE v_day_of_week
    END;

    v_day_hours := v_establishment.opening_hours -> v_day_of_week;
    
    IF v_day_hours IS NOT NULL THEN
      v_is_closed := (v_day_hours->>'closed')::boolean;
      IF v_is_closed = true THEN
        RAISE EXCEPTION 'Store is closed today';
      END IF;
      IF v_day_hours->>'open' IS NOT NULL AND v_day_hours->>'close' IS NOT NULL THEN
        v_current_time := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
        v_open_time := (v_day_hours->>'open')::time;
        v_close_time := (v_day_hours->>'close')::time;
        IF v_current_time < v_open_time OR v_current_time > v_close_time THEN
          RAISE EXCEPTION 'Store is outside business hours';
        END IF;
      END IF;
    END IF;
  END IF;

  IF p_total < 0 OR p_subtotal < 0 OR p_delivery_fee < 0 THEN
    RAISE EXCEPTION 'Invalid order amounts';
  END IF;

  IF p_order_type NOT IN ('delivery', 'pickup', 'dine_in') THEN
    RAISE EXCEPTION 'Invalid order type';
  END IF;

  -- Resolve display name: use provided name, or fetch from customer record
  v_display_name := p_customer_display_name;
  IF v_display_name IS NULL AND p_customer_id IS NOT NULL THEN
    SELECT name INTO v_display_name FROM customers WHERE id = p_customer_id;
  END IF;

  INSERT INTO orders (
    establishment_id, customer_id, payment_method, order_type,
    subtotal, delivery_fee, total, notes, change_for, scheduled_for, status,
    customer_display_name
  ) VALUES (
    p_establishment_id, p_customer_id, p_payment_method, p_order_type,
    p_subtotal, p_delivery_fee, p_total, p_notes, p_change_for, p_scheduled_for, 'pending',
    v_display_name
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;
  
  INSERT INTO order_status_history (order_id, status)
  VALUES (v_order_id, 'pending');
  
  SELECT json_build_object(
    'id', v_order_id,
    'order_number', v_order_number
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;

-- Backfill: set customer_display_name from customer.name where it's NULL
UPDATE orders o
SET customer_display_name = c.name
FROM customers c
WHERE o.customer_id = c.id
  AND o.customer_display_name IS NULL;
