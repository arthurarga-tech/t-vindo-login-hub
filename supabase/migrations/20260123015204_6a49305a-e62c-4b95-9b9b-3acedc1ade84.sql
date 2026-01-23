-- Create junction table to link addon groups to specific products
CREATE TABLE public.product_addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, addon_group_id)
);

-- Enable RLS
ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active product addon groups"
ON public.product_addon_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_addon_groups.product_id AND p.active = true
  )
);

CREATE POLICY "Members can view all product addon groups"
ON public.product_addon_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_addon_groups.product_id
    AND (is_establishment_member(auth.uid(), p.establishment_id) 
         OR is_establishment_owner(auth.uid(), p.establishment_id))
  )
);

CREATE POLICY "Members can create product addon groups"
ON public.product_addon_groups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_addon_groups.product_id
    AND (is_establishment_member(auth.uid(), p.establishment_id) 
         OR is_establishment_owner(auth.uid(), p.establishment_id))
  )
);

CREATE POLICY "Members can delete product addon groups"
ON public.product_addon_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_addon_groups.product_id
    AND (is_establishment_member(auth.uid(), p.establishment_id) 
         OR is_establishment_owner(auth.uid(), p.establishment_id))
  )
);