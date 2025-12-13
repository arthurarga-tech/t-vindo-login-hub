-- Allow anyone to view establishments by slug (for public store)
CREATE POLICY "Anyone can view establishments by slug"
ON public.establishments
FOR SELECT
USING (slug IS NOT NULL);