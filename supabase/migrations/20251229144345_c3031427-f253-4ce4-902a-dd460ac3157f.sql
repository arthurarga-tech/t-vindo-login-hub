-- Add QZ Tray configuration columns to establishments
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS qz_tray_enabled boolean DEFAULT false;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS qz_tray_printer text;