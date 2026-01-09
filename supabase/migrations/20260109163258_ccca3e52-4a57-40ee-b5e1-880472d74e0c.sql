-- ETAPA 3.2: Remover colunas legadas QZ Tray não utilizadas
ALTER TABLE establishments DROP COLUMN IF EXISTS qz_tray_enabled;
ALTER TABLE establishments DROP COLUMN IF EXISTS qz_tray_printer;