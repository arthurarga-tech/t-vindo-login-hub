-- Add temporary_closed column to establishments table
ALTER TABLE public.establishments
ADD COLUMN temporary_closed boolean DEFAULT false;

COMMENT ON COLUMN public.establishments.temporary_closed IS 
  'When true, the store is temporarily closed regardless of configured opening hours';

-- Update the public view to include temporary_closed
DROP VIEW IF EXISTS public.establishments_public;

CREATE VIEW public.establishments_public AS
SELECT 
  id,
  name,
  slug,
  description,
  logo_url,
  banner_url,
  address,
  neighborhood,
  city,
  phone,
  opening_hours,
  delivery_fee,
  min_order_value,
  delivery_info,
  service_delivery,
  service_pickup,
  service_dine_in,
  payment_cash_enabled,
  payment_credit_enabled,
  payment_debit_enabled,
  payment_pix_enabled,
  theme_primary_color,
  theme_secondary_color,
  allow_scheduling,
  temporary_closed,
  created_at,
  updated_at
FROM public.establishments;