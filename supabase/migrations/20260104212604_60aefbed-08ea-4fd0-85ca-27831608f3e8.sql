-- Add PIX configuration columns
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS pix_key_type TEXT;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS pix_holder_name TEXT;

-- Add payment method toggles
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS payment_pix_enabled BOOLEAN DEFAULT true;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS payment_credit_enabled BOOLEAN DEFAULT true;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS payment_debit_enabled BOOLEAN DEFAULT true;
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS payment_cash_enabled BOOLEAN DEFAULT true;