-- Add right margin setting for print customization
ALTER TABLE public.establishments 
ADD COLUMN print_margin_right integer DEFAULT 0;