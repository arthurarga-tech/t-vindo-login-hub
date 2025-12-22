-- Fix: Remove unrestricted UPDATE policy on customers table
-- This policy allowed anyone to modify customer records without authentication

DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;

-- Add proper policy: Only establishment members/owners can update customers
CREATE POLICY "Members can update establishment customers"
ON public.customers
FOR UPDATE
USING (
  is_establishment_member(auth.uid(), establishment_id) OR 
  is_establishment_owner(auth.uid(), establishment_id)
)
WITH CHECK (
  is_establishment_member(auth.uid(), establishment_id) OR 
  is_establishment_owner(auth.uid(), establishment_id)
);