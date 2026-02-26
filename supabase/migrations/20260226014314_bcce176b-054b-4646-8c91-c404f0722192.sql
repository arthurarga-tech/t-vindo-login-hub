
-- 1. Make customer_id nullable on orders
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Drop the FK constraint so customer_id can be NULL without issues
-- (FK already allows NULL by default, just need the column nullable)

-- 3. Update create_or_update_public_customer to return NULL when no phone
CREATE OR REPLACE FUNCTION public.create_or_update_public_customer(
  p_establishment_id uuid,
  p_name text,
  p_phone text,
  p_address text DEFAULT NULL,
  p_address_number text DEFAULT NULL,
  p_address_complement text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id uuid;
  v_phone_trimmed text;
BEGIN
  v_phone_trimmed := NULLIF(TRIM(COALESCE(p_phone, '')), '');

  IF v_phone_trimmed IS NOT NULL THEN
    -- Phone provided: upsert by phone
    SELECT id INTO v_customer_id
    FROM customers
    WHERE establishment_id = p_establishment_id AND phone = v_phone_trimmed;

    IF v_customer_id IS NOT NULL THEN
      UPDATE customers SET
        name = p_name,
        phone = v_phone_trimmed,
        address = p_address,
        address_number = p_address_number,
        address_complement = p_address_complement,
        neighborhood = p_neighborhood,
        city = p_city,
        updated_at = now()
      WHERE id = v_customer_id;
    ELSE
      INSERT INTO customers (
        establishment_id, name, phone, address, address_number,
        address_complement, neighborhood, city
      ) VALUES (
        p_establishment_id, p_name, v_phone_trimmed, p_address, p_address_number,
        p_address_complement, p_neighborhood, p_city
      )
      RETURNING id INTO v_customer_id;
    END IF;
  ELSE
    -- No phone: return NULL (anonymous order)
    v_customer_id := NULL;
  END IF;

  RETURN v_customer_id;
END;
$$;

-- 4. Update create_public_order to accept NULL customer_id
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
  p_scheduled_for timestamptz DEFAULT NULL
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

-- 5. Update get_public_order_by_id to handle NULL customer
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
    'customer', CASE WHEN c.id IS NOT NULL THEN json_build_object(
      'name', c.name,
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
    ) ELSE json_build_object(
      'name', COALESCE(o.customer_display_name, 'Cliente'),
      'phone', null,
      'address', null,
      'address_number', null,
      'address_complement', null,
      'neighborhood', null,
      'city', null
    ) END,
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
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE o.id = p_order_id
    AND o.created_at > now() - INTERVAL '30 days';
  
  RETURN v_result;
END;
$$;

-- 6. Update get_public_order_by_number to handle NULL customer
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
    'customer', CASE WHEN c.id IS NOT NULL THEN json_build_object(
      'name', c.name,
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
    ) ELSE json_build_object(
      'name', COALESCE(o.customer_display_name, 'Cliente'),
      'phone', null,
      'address', null,
      'address_number', null,
      'address_complement', null,
      'neighborhood', null,
      'city', null
    ) END,
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
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE o.establishment_id = p_establishment_id
    AND o.order_number = p_order_number
    AND o.created_at > now() - INTERVAL '30 days';
  
  RETURN v_result;
END;
$$;

-- 7. Migrate legacy "Balcão" data
-- Set customer_display_name on orders that don't have it yet, then unlink
UPDATE orders o
SET customer_id = NULL,
    customer_display_name = COALESCE(o.customer_display_name, 'Balcão')
WHERE o.customer_id IN (
  SELECT c.id FROM customers c
  WHERE c.name = 'Balcão' AND (c.phone IS NULL OR c.phone = '')
);

-- Also unlink tables from Balcão customers
UPDATE tables t
SET customer_id = NULL
WHERE t.customer_id IN (
  SELECT c.id FROM customers c
  WHERE c.name = 'Balcão' AND (c.phone IS NULL OR c.phone = '')
);

-- Delete the Balcão customer records (now safe, no FKs pointing to them)
DELETE FROM customers
WHERE name = 'Balcão' AND (phone IS NULL OR phone = '');
