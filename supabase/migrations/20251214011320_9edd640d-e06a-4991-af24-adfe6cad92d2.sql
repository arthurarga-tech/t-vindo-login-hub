-- Add theme color columns to establishments
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS theme_primary_color text DEFAULT '#ea580c',
ADD COLUMN IF NOT EXISTS theme_secondary_color text DEFAULT '#1e293b';