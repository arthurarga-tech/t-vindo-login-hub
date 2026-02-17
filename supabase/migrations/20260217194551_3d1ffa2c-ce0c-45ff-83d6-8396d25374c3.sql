
-- Add new role values to the establishment_role enum
ALTER TYPE public.establishment_role ADD VALUE IF NOT EXISTS 'attendant';
ALTER TYPE public.establishment_role ADD VALUE IF NOT EXISTS 'kitchen';
ALTER TYPE public.establishment_role ADD VALUE IF NOT EXISTS 'waiter';

-- Allow owners to view profiles of members in their establishment
CREATE POLICY "Owners can view member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.establishment_members em
    JOIN public.establishments e ON e.id = em.establishment_id
    WHERE em.user_id = profiles.user_id
      AND e.owner_id = auth.uid()
  )
);
