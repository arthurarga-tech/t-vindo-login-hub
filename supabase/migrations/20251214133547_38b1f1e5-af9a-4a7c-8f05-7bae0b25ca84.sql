-- Add unique constraint for phone + establishment_id to prevent duplicate customers
ALTER TABLE public.customers 
ADD CONSTRAINT customers_phone_establishment_unique 
UNIQUE (phone, establishment_id);