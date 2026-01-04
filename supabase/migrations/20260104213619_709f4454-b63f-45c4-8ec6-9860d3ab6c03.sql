-- Add delivery fee column to establishments
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;