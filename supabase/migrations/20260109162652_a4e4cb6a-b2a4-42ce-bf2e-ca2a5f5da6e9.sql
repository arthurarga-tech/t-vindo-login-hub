-- ETAPA 1.2: Remover TODAS as políticas RLS permissivas restantes
-- Estas políticas têm nomes diferentes dos que tentei remover antes

-- 1. Remover políticas permissivas de customers
DROP POLICY IF EXISTS "Public can create customers" ON customers;

-- 2. Remover políticas permissivas de orders
DROP POLICY IF EXISTS "Public can create orders" ON orders;

-- 3. Remover políticas permissivas de order_items
DROP POLICY IF EXISTS "Public can create order items" ON order_items;

-- 4. Remover políticas permissivas de order_item_addons
DROP POLICY IF EXISTS "Public can create order item addons" ON order_item_addons;

-- 5. Remover políticas permissivas de order_status_history
DROP POLICY IF EXISTS "Public can create order status history" ON order_status_history;

-- 6. Criar view pública segura para establishments (sem dados sensíveis)
CREATE OR REPLACE VIEW public.establishments_public AS
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

-- 7. Permitir SELECT público apenas na view segura
GRANT SELECT ON public.establishments_public TO anon, authenticated;