
-- Drop the restrictive public policy and recreate as PERMISSIVE
-- so authenticated users can view OTHER stores' public pages
DROP POLICY IF EXISTS "Public can view establishments via view only" ON public.establishments;

CREATE POLICY "Public can view establishments via view only"
ON public.establishments
FOR SELECT
TO public
USING (slug IS NOT NULL);
