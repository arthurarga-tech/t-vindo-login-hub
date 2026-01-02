-- Add print customization fields to establishments table
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS print_font_size integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS print_margin_left integer DEFAULT 0;