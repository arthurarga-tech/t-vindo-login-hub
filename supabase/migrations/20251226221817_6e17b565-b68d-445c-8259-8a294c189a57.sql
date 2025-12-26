-- Drop the broken storage policies
DROP POLICY IF EXISTS "Members can upload to their establishment folder" ON storage.objects;
DROP POLICY IF EXISTS "Members can update their establishment images" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete their establishment images" ON storage.objects;

-- Recreate with correct logic: check that the folder path starts with establishment_id
-- and user is a member/owner of that establishment

CREATE POLICY "Members can upload to their establishment folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM establishments e
    WHERE (storage.foldername(name))[1] = e.id::text
    AND (is_establishment_owner(auth.uid(), e.id) OR is_establishment_member(auth.uid(), e.id))
  )
);

CREATE POLICY "Members can update their establishment images"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM establishments e
    WHERE (storage.foldername(name))[1] = e.id::text
    AND (is_establishment_owner(auth.uid(), e.id) OR is_establishment_member(auth.uid(), e.id))
  )
);

CREATE POLICY "Members can delete their establishment images"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM establishments e
    WHERE (storage.foldername(name))[1] = e.id::text
    AND (is_establishment_owner(auth.uid(), e.id) OR is_establishment_member(auth.uid(), e.id))
  )
);