-- Fix 1: Restrict product-images storage policies to establishment members only
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- Allow upload only if user is owner or member of an establishment
CREATE POLICY "Establishment members can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (
    -- User is owner of any establishment (permissive for new uploads)
    EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.owner_id = auth.uid()
    )
    OR
    -- User is member of any establishment
    EXISTS (
      SELECT 1 FROM public.establishment_members em
      WHERE em.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Establishment members can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.establishment_members em
      WHERE em.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Establishment members can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.establishment_members em
      WHERE em.user_id = auth.uid()
    )
  )
);

-- Fix 2: Remove overly permissive public SELECT on establishments table
-- The public store should only access data via the establishments_public view
-- Remove the policy that allows reading when slug IS NOT NULL (exposes sensitive fields)
DROP POLICY IF EXISTS "Public can view establishments via view only" ON public.establishments;

-- Replace with a more restrictive policy that only applies when authenticated
-- Public store access goes through establishments_public view (which hides sensitive fields)
-- Authenticated users still need to see their own establishment
-- This policy now only allows authenticated users to see their own or member establishments
-- (the establishments_public view handles anonymous store access without sensitive data)
CREATE POLICY "Only authenticated members can view establishments directly"
ON public.establishments
FOR SELECT
USING (
  -- Authenticated owners
  (auth.uid() IS NOT NULL AND owner_id = auth.uid())
  OR
  -- Authenticated members
  (auth.uid() IS NOT NULL AND public.is_establishment_member(auth.uid(), id))
);