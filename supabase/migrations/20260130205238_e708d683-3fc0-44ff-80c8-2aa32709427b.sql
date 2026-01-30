-- Update establishments_public view to include PIX payment fields
-- PIX key/type/holder are legitimately needed for customer payments during checkout
DROP VIEW IF EXISTS public.establishments_public;

CREATE VIEW public.establishments_public
WITH (security_invoker=on) AS
SELECT 
  id,
  name,
  slug,
  description,
  logo_url,
  banner_url,
  phone,
  address,
  neighborhood,
  city,
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
  pix_key,
  pix_key_type,
  pix_holder_name,
  allow_scheduling,
  temporary_closed,
  theme_primary_color,
  theme_secondary_color,
  created_at,
  updated_at
FROM public.establishments
WHERE slug IS NOT NULL;

-- Grant SELECT on the view
GRANT SELECT ON public.establishments_public TO anon;
GRANT SELECT ON public.establishments_public TO authenticated;