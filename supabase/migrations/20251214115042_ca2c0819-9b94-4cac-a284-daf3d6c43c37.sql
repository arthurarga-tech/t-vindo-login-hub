-- Allow inserts to return the inserted row for public checkout
DROP POLICY IF EXISTS "Members can view establishment customers" ON public.customers;

CREATE POLICY "Members can view establishment customers" 
ON public.customers
FOR SELECT
TO anon, authenticated
USING (true);