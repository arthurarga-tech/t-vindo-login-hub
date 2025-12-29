-- Create RPC function to create orders (SECURITY DEFINER bypasses RLS)
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
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number int;
  v_result json;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.create_public_order TO anon, authenticated;

-- Create RPC function to create order items
CREATE OR REPLACE FUNCTION public.create_public_order_items(
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_result jsonb := '[]'::jsonb;
  v_inserted_id uuid;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, product_name, product_price, quantity, total, observation
    ) VALUES (
      (v_item->>'order_id')::uuid,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'product_price')::numeric,
      (v_item->>'quantity')::int,
      (v_item->>'total')::numeric,
      v_item->>'observation'
    )
    RETURNING id INTO v_inserted_id;
    
    v_result := v_result || jsonb_build_array(jsonb_build_object('id', v_inserted_id, 'index', v_item->>'index'));
  END LOOP;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_order_items TO anon, authenticated;

-- Create RPC function to create order item addons
CREATE OR REPLACE FUNCTION public.create_public_order_item_addons(
  p_addons jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_addon jsonb;
BEGIN
  FOR v_addon IN SELECT * FROM jsonb_array_elements(p_addons)
  LOOP
    INSERT INTO order_item_addons (
      order_item_id, addon_id, addon_name, addon_price, quantity
    ) VALUES (
      (v_addon->>'order_item_id')::uuid,
      (v_addon->>'addon_id')::uuid,
      v_addon->>'addon_name',
      (v_addon->>'addon_price')::numeric,
      (v_addon->>'quantity')::int
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_order_item_addons TO anon, authenticated;

-- Create RPC function to create/update customer
CREATE OR REPLACE FUNCTION public.create_or_update_public_customer(
  p_establishment_id uuid,
  p_name text,
  p_phone text,
  p_address text DEFAULT NULL,
  p_address_number text DEFAULT NULL,
  p_address_complement text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_city text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Check if customer exists
  SELECT id INTO v_customer_id
  FROM customers
  WHERE establishment_id = p_establishment_id AND phone = p_phone;
  
  IF v_customer_id IS NOT NULL THEN
    -- Update existing customer
    UPDATE customers SET
      name = p_name,
      address = p_address,
      address_number = p_address_number,
      address_complement = p_address_complement,
      neighborhood = p_neighborhood,
      city = p_city,
      updated_at = now()
    WHERE id = v_customer_id;
  ELSE
    -- Create new customer
    INSERT INTO customers (
      establishment_id, name, phone, address, address_number,
      address_complement, neighborhood, city
    ) VALUES (
      p_establishment_id, p_name, p_phone, p_address, p_address_number,
      p_address_complement, p_neighborhood, p_city
    )
    RETURNING id INTO v_customer_id;
  END IF;
  
  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_update_public_customer TO anon, authenticated;