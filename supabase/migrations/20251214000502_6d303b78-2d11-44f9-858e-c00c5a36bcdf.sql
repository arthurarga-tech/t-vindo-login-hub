-- Create addon_groups table (linked to categories)
CREATE TABLE public.addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selections INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT false,
  order_position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create addons table
CREATE TABLE public.addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_item_addons table
CREATE TABLE public.order_item_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id),
  addon_name TEXT NOT NULL,
  addon_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;

-- RLS policies for addon_groups
CREATE POLICY "Anyone can view active addon groups"
ON public.addon_groups FOR SELECT
USING (active = true);

CREATE POLICY "Members can view all addon groups"
ON public.addon_groups FOR SELECT
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can create addon groups"
ON public.addon_groups FOR INSERT
WITH CHECK (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can update addon groups"
ON public.addon_groups FOR UPDATE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

CREATE POLICY "Members can delete addon groups"
ON public.addon_groups FOR DELETE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- RLS policies for addons
CREATE POLICY "Anyone can view active addons"
ON public.addons FOR SELECT
USING (active = true);

CREATE POLICY "Members can view all addons"
ON public.addons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.addon_groups ag
    WHERE ag.id = addon_group_id
    AND (is_establishment_member(auth.uid(), ag.establishment_id) OR is_establishment_owner(auth.uid(), ag.establishment_id))
  )
);

CREATE POLICY "Members can create addons"
ON public.addons FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.addon_groups ag
    WHERE ag.id = addon_group_id
    AND (is_establishment_member(auth.uid(), ag.establishment_id) OR is_establishment_owner(auth.uid(), ag.establishment_id))
  )
);

CREATE POLICY "Members can update addons"
ON public.addons FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.addon_groups ag
    WHERE ag.id = addon_group_id
    AND (is_establishment_member(auth.uid(), ag.establishment_id) OR is_establishment_owner(auth.uid(), ag.establishment_id))
  )
);

CREATE POLICY "Members can delete addons"
ON public.addons FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.addon_groups ag
    WHERE ag.id = addon_group_id
    AND (is_establishment_member(auth.uid(), ag.establishment_id) OR is_establishment_owner(auth.uid(), ag.establishment_id))
  )
);

-- RLS policies for order_item_addons
CREATE POLICY "Anyone can create order item addons"
ON public.order_item_addons FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view order item addons"
ON public.order_item_addons FOR SELECT
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_addon_groups_updated_at
BEFORE UPDATE ON public.addon_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addons_updated_at
BEFORE UPDATE ON public.addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();