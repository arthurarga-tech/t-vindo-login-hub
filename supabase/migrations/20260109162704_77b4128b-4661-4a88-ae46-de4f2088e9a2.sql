-- Corrigir SECURITY DEFINER na view
-- Recriar a view com SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS public.establishments_public;

CREATE VIEW public.establishments_public 
WITH (security_invoker = true)
AS
SELECT 
  id, name, slug, description, logo_url, banner_url,
  address, neighborhood, city, phone,
  opening_hours, allow_scheduling,
  service_delivery, service_pickup, service_dine_in,
  delivery_fee, min_order_value, delivery_info,
  payment_cash_enabled, payment_pix_enabled, 
  payment_credit_enabled, payment_debit_enabled,
  theme_primary_color, theme_secondary_color,
  created_at, updated_at
FROM establishments;

-- Permitir SELECT público na view segura
GRANT SELECT ON public.establishments_public TO anon, authenticated;