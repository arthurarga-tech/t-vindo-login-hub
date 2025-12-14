-- Add UPDATE policy for customers table to allow upsert
CREATE POLICY "Anyone can update customers"
ON public.customers
FOR UPDATE
USING (true)
WITH CHECK (true);