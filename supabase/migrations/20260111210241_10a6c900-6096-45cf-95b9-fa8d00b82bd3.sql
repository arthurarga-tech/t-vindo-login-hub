-- Add preparation time configuration fields to establishments
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS preparation_time_mode TEXT DEFAULT 'auto_daily';

ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS manual_preparation_time INTEGER DEFAULT 30;

ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS manual_delivery_time INTEGER DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN public.establishments.preparation_time_mode IS 'Mode for preparation time calculation: auto_daily or manual';
COMMENT ON COLUMN public.establishments.manual_preparation_time IS 'Manual preparation time in minutes (used when mode = manual)';
COMMENT ON COLUMN public.establishments.manual_delivery_time IS 'Manual delivery time in minutes (used when mode = manual)';