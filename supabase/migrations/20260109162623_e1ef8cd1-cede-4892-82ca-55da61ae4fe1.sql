-- ETAPA 1: SEGURANÇA - Remover políticas RLS permissivas
-- O fluxo público usa funções RPC com SECURITY DEFINER, não INSERT direto

-- 1.1 Remover políticas permissivas de orders
DROP POLICY IF EXISTS "Allow public order creation" ON orders;

-- 1.2 Remover políticas permissivas de order_items
DROP POLICY IF EXISTS "Allow public order item creation" ON order_items;

-- 1.3 Remover políticas permissivas de order_item_addons
DROP POLICY IF EXISTS "Allow public order item addon creation" ON order_item_addons;

-- 1.4 Remover políticas permissivas de order_status_history
DROP POLICY IF EXISTS "Allow public order status history creation" ON order_status_history;

-- 1.5 Remover políticas permissivas de customers
DROP POLICY IF EXISTS "Allow public customer creation" ON customers;

-- 1.6 Remover política que expõe dados de clientes publicamente
-- A função RPC create_or_update_public_customer já lida com lookup de forma segura
DROP POLICY IF EXISTS "Anyone can check customer by phone for checkout" ON customers;