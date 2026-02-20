
-- Create category_addon_groups junction table
CREATE TABLE public.category_addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  addon_group_id uuid NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, addon_group_id)
);

-- Make category_id nullable in addon_groups to support global groups
ALTER TABLE public.addon_groups ALTER COLUMN category_id DROP NOT NULL;

-- Indexes for performance
CREATE INDEX idx_category_addon_groups_category_id ON public.category_addon_groups(category_id);
CREATE INDEX idx_category_addon_groups_addon_group_id ON public.category_addon_groups(addon_group_id);

-- Enable RLS
ALTER TABLE public.category_addon_groups ENABLE ROW LEVEL SECURITY;

-- Public read access for store to work
CREATE POLICY "Anyone can view category addon links"
  ON public.category_addon_groups
  FOR SELECT
  USING (true);

-- Members/owners can manage links
CREATE POLICY "Members can manage category addon links"
  ON public.category_addon_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_addon_groups.category_id
        AND (
          is_establishment_owner(auth.uid(), c.establishment_id)
          OR is_establishment_member(auth.uid(), c.establishment_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_addon_groups.category_id
        AND (
          is_establishment_owner(auth.uid(), c.establishment_id)
          OR is_establishment_member(auth.uid(), c.establishment_id)
        )
    )
  );
