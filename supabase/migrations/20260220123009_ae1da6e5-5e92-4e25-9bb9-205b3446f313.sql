-- ============================================================
-- Security: Rate limiting table + enhanced public order RPC
-- ============================================================

-- 1. Rate limiting table for edge function abuse prevention
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,        -- IP or user id
  action text NOT NULL,            -- e.g. 'create_team_member'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (used from edge functions via service key)
-- No user-facing policies needed

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_identifier_action_created
  ON public.rate_limit_logs (identifier, action, created_at DESC);

-- Auto-cleanup old entries (keep only last 24h)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_logs
  WHERE created_at < now() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_cleanup_rate_limits
  AFTER INSERT ON public.rate_limit_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_rate_limit_logs();

-- ============================================================
-- 2. Fix get_public_order_by_id: mask phone + 30-day limit
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_order_by_id(p_order_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'created_at', o.created_at,
    'scheduled_for', o.scheduled_for,
    'total', o.total,
    'delivery_fee', o.delivery_fee,
    'payment_method', o.payment_method,
    'change_for', o.change_for,
    'notes', o.notes,
    'customer', json_build_object(
      'name', c.name,
      -- Mask phone: show only last 4 digits
      'phone', CASE 
        WHEN c.phone IS NOT NULL AND length(c.phone) > 4 
        THEN repeat('*', length(c.phone) - 4) || right(c.phone, 4)
        ELSE c.phone
      END,
      'address', c.address,
      'address_number', c.address_number,
      'address_complement', c.address_complement,
      'neighborhood', c.neighborhood,
      'city', c.city
    ),
    'items', (
      SELECT json_agg(json_build_object(
        'id', oi.id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'total', oi.total,
        'addons', (
          SELECT json_agg(json_build_object(
            'id', oia.id,
            'addon_name', oia.addon_name,
            'addon_price', oia.addon_price,
            'quantity', oia.quantity
          ))
          FROM order_item_addons oia
          WHERE oia.order_item_id = oi.id
        )
      ))
      FROM order_items oi
      WHERE oi.order_id = o.id
    )
  ) INTO v_result
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.id = p_order_id
    -- Only allow tracking orders from last 30 days
    AND o.created_at > now() - INTERVAL '30 days';
  
  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. Fix get_public_order_by_number: mask phone + 30-day limit
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_order_by_number(p_establishment_id uuid, p_order_number integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'created_at', o.created_at,
    'scheduled_for', o.scheduled_for,
    'total', o.total,
    'delivery_fee', o.delivery_fee,
    'payment_method', o.payment_method,
    'change_for', o.change_for,
    'notes', o.notes,
    'customer', json_build_object(
      'name', c.name,
      -- Mask phone: show only last 4 digits
      'phone', CASE 
        WHEN c.phone IS NOT NULL AND length(c.phone) > 4 
        THEN repeat('*', length(c.phone) - 4) || right(c.phone, 4)
        ELSE c.phone
      END,
      'address', c.address,
      'address_number', c.address_number,
      'address_complement', c.address_complement,
      'neighborhood', c.neighborhood,
      'city', c.city
    ),
    'items', (
      SELECT json_agg(json_build_object(
        'id', oi.id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'total', oi.total,
        'addons', (
          SELECT json_agg(json_build_object(
            'id', oia.id,
            'addon_name', oia.addon_name,
            'addon_price', oia.addon_price,
            'quantity', oia.quantity
          ))
          FROM order_item_addons oia
          WHERE oia.order_item_id = oi.id
        )
      ))
      FROM order_items oi
      WHERE oi.order_id = o.id
    )
  ) INTO v_result
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.establishment_id = p_establishment_id
    AND o.order_number = p_order_number
    -- Only allow tracking orders from last 30 days
    AND o.created_at > now() - INTERVAL '30 days';
  
  RETURN v_result;
END;
$$;

-- ============================================================
-- 4. Add business validation to create_public_order
-- ============================================================
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
  p_scheduled_for timestamp with time zone DEFAULT NULL
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
BEGIN
  -- Validate establishment exists and is not temporarily closed
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

  -- For non-scheduled orders, validate opening hours
  IF p_scheduled_for IS NULL AND v_establishment.opening_hours IS NOT NULL THEN
    v_day_of_week := lower(to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'day'));
    v_day_of_week := rtrim(v_day_of_week);
    
    -- Map Portuguese day names
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
      
      -- Check time window
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

  -- Basic input validation
  IF p_total < 0 OR p_subtotal < 0 OR p_delivery_fee < 0 THEN
    RAISE EXCEPTION 'Invalid order amounts';
  END IF;

  IF p_order_type NOT IN ('delivery', 'pickup', 'dine_in') THEN
    RAISE EXCEPTION 'Invalid order type';
  END IF;

  INSERT INTO orders (
    establishment_id, customer_id, payment_method, order_type,
    subtotal, delivery_fee, total, notes, change_for, scheduled_for, status
  ) VALUES (
    p_establishment_id, p_customer_id, p_payment_method, p_order_type,
    p_subtotal, p_delivery_fee, p_total, p_notes, p_change_for, p_scheduled_for, 'pending'
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
$$;