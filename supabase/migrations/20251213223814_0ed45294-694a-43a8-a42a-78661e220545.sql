-- Add slug column to establishments for public store URL
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  order_position integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  active boolean DEFAULT true,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Categories RLS Policies
-- Public read for active categories
CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
USING (active = true);

-- Establishment members can view all their categories
CREATE POLICY "Members can view all establishment categories"
ON public.categories
FOR SELECT
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Only owners and members can insert categories
CREATE POLICY "Members can create categories"
ON public.categories
FOR INSERT
WITH CHECK (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Only owners and members can update categories
CREATE POLICY "Members can update categories"
ON public.categories
FOR UPDATE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Only owners and members can delete categories
CREATE POLICY "Members can delete categories"
ON public.categories
FOR DELETE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Products RLS Policies
-- Public read for active products
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (active = true);

-- Establishment members can view all their products
CREATE POLICY "Members can view all establishment products"
ON public.products
FOR SELECT
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Only owners and members can insert products
CREATE POLICY "Members can create products"
ON public.products
FOR INSERT
WITH CHECK (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Only owners and members can update products
CREATE POLICY "Members can update products"
ON public.products
FOR UPDATE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Only owners and members can delete products
CREATE POLICY "Members can delete products"
ON public.products
FOR DELETE
USING (is_establishment_member(auth.uid(), establishment_id) OR is_establishment_owner(auth.uid(), establishment_id));

-- Create indexes for better performance
CREATE INDEX idx_categories_establishment ON public.categories(establishment_id);
CREATE INDEX idx_categories_order ON public.categories(establishment_id, order_position);
CREATE INDEX idx_products_establishment ON public.products(establishment_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_order ON public.products(establishment_id, order_position);

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');