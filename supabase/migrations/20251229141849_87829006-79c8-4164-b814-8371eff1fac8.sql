-- Add printer_name column to establishments table
ALTER TABLE public.establishments 
ADD COLUMN printer_name text;

-- Add comment for documentation
COMMENT ON COLUMN public.establishments.printer_name IS 'Name of the configured thermal printer for reference';