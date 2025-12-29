-- Fix RLS policies for public order creation
-- Drop and recreate INSERT policies with correct role specification

-- Fix orders INSERT policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Public can create orders" ON public.orders
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix order_items INSERT policy
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Public can create order items" ON public.order_items
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix order_item_addons INSERT policy
DROP POLICY IF EXISTS "Anyone can create order item addons" ON public.order_item_addons;
CREATE POLICY "Public can create order item addons" ON public.order_item_addons
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix order_status_history INSERT policy
DROP POLICY IF EXISTS "Anyone can create order status history" ON public.order_status_history;
CREATE POLICY "Public can create order status history" ON public.order_status_history
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix customers INSERT policy (for new customer creation during checkout)
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
CREATE POLICY "Public can create customers" ON public.customers
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);