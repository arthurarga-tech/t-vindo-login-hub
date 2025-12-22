-- Add observation field to order_items table
ALTER TABLE public.order_items
ADD COLUMN observation text;