-- ============================================
-- FIX 1: PUBLIC_DATA_EXPOSURE - Secure order-related tables
-- ============================================

-- Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view their own orders by id" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Anyone can view order item addons" ON public.order_item_addons;

-- Orders: Only establishment members can view
CREATE POLICY "Members can view establishment orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  is_establishment_member(auth.uid(), establishment_id) OR 
  is_establishment_owner(auth.uid(), establishment_id)
);

-- Order items: Members can view via order relationship
CREATE POLICY "Members can view establishment order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR 
         is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

-- Order status history: Members can view via order relationship
CREATE POLICY "Members can view order status history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_status_history.order_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR 
         is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

-- Order item addons: Members can view via order item relationship
CREATE POLICY "Members can view order item addons"
ON public.order_item_addons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR 
         is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

-- ============================================
-- Create secure RPC functions for public order tracking
-- ============================================

-- Function to get order by order number (for public tracking page)
CREATE OR REPLACE FUNCTION public.get_public_order_by_number(
  p_establishment_id uuid,
  p_order_number integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Return limited order information for public tracking
  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'created_at', o.created_at,
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
        'total', oi.total
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

-- Function to get order by ID (for order confirmation page)
CREATE OR REPLACE FUNCTION public.get_public_order_by_id(
  p_order_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Return limited order information for confirmation page
  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'order_type', o.order_type,
    'created_at', o.created_at,
    'total', o.total,
    'delivery_fee', o.delivery_fee,
    'subtotal', o.subtotal,
    'payment_method', o.payment_method,
    'change_for', o.change_for,
    'notes', o.notes,
    'establishment_id', o.establishment_id,
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
        'product_price', oi.product_price
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

-- ============================================
-- FIX 2: INPUT_VALIDATION - Remove unsafe customer update policy
-- ============================================

DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;

-- Only members can update customers (policy might already exist, use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' 
    AND policyname = 'Members can update establishment customers'
  ) THEN
    EXECUTE 'CREATE POLICY "Members can update establishment customers"
    ON public.customers
    FOR UPDATE
    TO authenticated
    USING (
      is_establishment_member(auth.uid(), establishment_id) OR 
      is_establishment_owner(auth.uid(), establishment_id)
    )
    WITH CHECK (
      is_establishment_member(auth.uid(), establishment_id) OR 
      is_establishment_owner(auth.uid(), establishment_id)
    )';
  END IF;
END;
$$;

-- ============================================
-- FIX 3: STORAGE_EXPOSURE - Fix storage policies
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload to their establishment folder" ON storage.objects;
DROP POLICY IF EXISTS "Members can update their establishment images" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete their establishment images" ON storage.objects;

-- Create secure storage policies with ownership validation
CREATE POLICY "Members can upload to their establishment folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM establishments e
      WHERE (storage.foldername(name))[1] = e.id::text
      AND (is_establishment_owner(auth.uid(), e.id) OR 
           is_establishment_member(auth.uid(), e.id))
    )
  )
);

CREATE POLICY "Members can update their establishment images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM establishments e
      WHERE (storage.foldername(name))[1] = e.id::text
      AND (is_establishment_owner(auth.uid(), e.id) OR 
           is_establishment_member(auth.uid(), e.id))
    )
  )
);

CREATE POLICY "Members can delete their establishment images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM establishments e
      WHERE (storage.foldername(name))[1] = e.id::text
      AND (is_establishment_owner(auth.uid(), e.id) OR 
           is_establishment_member(auth.uid(), e.id))
    )
  )
);

-- ============================================
-- FIX 4: DEFINER_OR_RPC_BYPASS - Add authorization to write functions
-- ============================================

-- Update create_default_financial_categories with authorization check
CREATE OR REPLACE FUNCTION public.create_default_financial_categories(est_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow establishment owners to create default categories
  IF NOT is_establishment_owner(auth.uid(), est_id) THEN
    RAISE EXCEPTION 'Only establishment owners can create default categories';
  END IF;

  INSERT INTO financial_categories (establishment_id, name, type, icon, is_default) VALUES
    (est_id, 'Equipamentos', 'expense', 'wrench', true),
    (est_id, 'Fornecedores', 'expense', 'truck', true),
    (est_id, 'Marketing', 'expense', 'megaphone', true),
    (est_id, 'Manutenção', 'expense', 'hammer', true),
    (est_id, 'Outros', 'expense', 'circle-dot', true),
    (est_id, 'Vendas', 'income', 'shopping-cart', true),
    (est_id, 'Outros', 'income', 'circle-dot', true);
END;
$$;