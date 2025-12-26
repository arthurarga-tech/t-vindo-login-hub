-- Fix PUBLIC_DATA_EXPOSURE: Drop the overly permissive SELECT policy on customers
-- and replace with proper establishment membership check

DROP POLICY IF EXISTS "Members can view establishment customers" ON public.customers;

CREATE POLICY "Members can view establishment customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  is_establishment_member(auth.uid(), establishment_id) OR 
  is_establishment_owner(auth.uid(), establishment_id)
);