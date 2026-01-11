-- Update the correct function get_public_order_by_number(uuid, integer) to include addons
CREATE OR REPLACE FUNCTION public.get_public_order_by_number(p_establishment_id uuid, p_order_number integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'phone', c.phone,
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
    AND o.order_number = p_order_number;
  
  RETURN v_result;
END;
$$;

-- Drop the unused duplicate function with different signature
DROP FUNCTION IF EXISTS public.get_public_order_by_number(text);

-- Update get_public_order_by_id to include addons
CREATE OR REPLACE FUNCTION public.get_public_order_by_id(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'phone', c.phone,
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
  WHERE o.id = p_order_id;
  
  RETURN v_result;
END;
$$;