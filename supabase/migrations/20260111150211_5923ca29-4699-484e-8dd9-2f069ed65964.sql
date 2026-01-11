-- Update get_public_order_by_number to include addons in items
CREATE OR REPLACE FUNCTION public.get_public_order_by_number(p_order_number text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'payment_method', o.payment_method,
    'change_for', o.change_for,
    'notes', o.notes,
    'created_at', o.created_at,
    'customer', json_build_object(
      'name', c.name,
      'phone', c.phone,
      'address', c.address,
      'address_number', c.address_number,
      'address_complement', c.address_complement,
      'neighborhood', c.neighborhood,
      'city', c.city,
      'reference_point', c.reference_point
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
  ) INTO result
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.order_number = p_order_number;

  RETURN result;
END;
$$;

-- Update get_public_order_by_id to include addons in items
CREATE OR REPLACE FUNCTION public.get_public_order_by_id(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'payment_method', o.payment_method,
    'change_for', o.change_for,
    'notes', o.notes,
    'created_at', o.created_at,
    'customer', json_build_object(
      'name', c.name,
      'phone', c.phone,
      'address', c.address,
      'address_number', c.address_number,
      'address_complement', c.address_complement,
      'neighborhood', c.neighborhood,
      'city', c.city,
      'reference_point', c.reference_point
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
  ) INTO result
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.id = p_order_id;

  RETURN result;
END;
$$;