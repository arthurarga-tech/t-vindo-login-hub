-- Add print settings columns to establishments table
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS print_mode text DEFAULT 'none' CHECK (print_mode IN ('none', 'on_order', 'on_confirm'));