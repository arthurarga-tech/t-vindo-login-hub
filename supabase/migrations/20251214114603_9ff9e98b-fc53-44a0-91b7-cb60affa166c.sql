-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;

CREATE POLICY "Anyone can create customers" 
ON public.customers 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);