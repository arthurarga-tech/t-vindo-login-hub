-- Add new columns to establishments table for business information
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{
  "monday": {"open": "08:00", "close": "22:00", "closed": false},
  "tuesday": {"open": "08:00", "close": "22:00", "closed": false},
  "wednesday": {"open": "08:00", "close": "22:00", "closed": false},
  "thursday": {"open": "08:00", "close": "22:00", "closed": false},
  "friday": {"open": "08:00", "close": "23:00", "closed": false},
  "saturday": {"open": "10:00", "close": "23:00", "closed": false},
  "sunday": {"open": "10:00", "close": "20:00", "closed": true}
}'::jsonb,
ADD COLUMN IF NOT EXISTS delivery_info TEXT,
ADD COLUMN IF NOT EXISTS min_order_value NUMERIC DEFAULT 0;