-- Etapa 1: Alterações no Banco de Dados para Fluxos Balcão/Mesa

-- 1. Tornar telefone opcional em customers
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN phone SET DEFAULT '';

-- 2. Adicionar origem do cliente (delivery, counter, table)
ALTER TABLE customers ADD COLUMN order_origin text DEFAULT 'delivery';

-- 3. Adicionar campos de mesa em orders
ALTER TABLE orders ADD COLUMN order_subtype text DEFAULT NULL;
ALTER TABLE orders ADD COLUMN table_number text DEFAULT NULL;
ALTER TABLE orders ADD COLUMN is_open_tab boolean DEFAULT false;

-- 4. Adicionar modalidade mesa em establishments
ALTER TABLE establishments ADD COLUMN service_table boolean DEFAULT false;