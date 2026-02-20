
-- Create product_addon_exclusions table
-- This allows excluding category-level addon groups from specific products
CREATE TABLE public.product_addon_exclusions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  addon_group_id uuid NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(product_id, addon_group_id)
);

-- Enable Row-Level Security
ALTER TABLE public.product_addon_exclusions ENABLE ROW LEVEL SECURITY;

-- Public read: allow the store frontend to filter excluded addon groups
CREATE POLICY "Anyone can view product addon exclusions"
ON public.product_addon_exclusions
FOR SELECT
USING (true);

-- Members can manage exclusions for products belonging to their establishment
CREATE POLICY "Members can create product addon exclusions"
ON public.product_addon_exclusions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_addon_exclusions.product_id
      AND (
        is_establishment_member(auth.uid(), p.establishment_id)
        OR is_establishment_owner(auth.uid(), p.establishment_id)
      )
  )
);

CREATE POLICY "Members can delete product addon exclusions"
ON public.product_addon_exclusions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_addon_exclusions.product_id
      AND (
        is_establishment_member(auth.uid(), p.establishment_id)
        OR is_establishment_owner(auth.uid(), p.establishment_id)
      )
  )
);
