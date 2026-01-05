-- Add print customization columns to establishments table
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS print_font_bold BOOLEAN DEFAULT true;

ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS print_line_height DECIMAL DEFAULT 1.4;

ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS print_contrast_high BOOLEAN DEFAULT false;