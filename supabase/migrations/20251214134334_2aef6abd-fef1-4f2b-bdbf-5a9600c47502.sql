-- Add service modalities to establishments
ALTER TABLE public.establishments
ADD COLUMN service_delivery BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN service_pickup BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN service_dine_in BOOLEAN NOT NULL DEFAULT false;

-- Add order type to orders
ALTER TABLE public.orders
ADD COLUMN order_type TEXT NOT NULL DEFAULT 'delivery'
CHECK (order_type IN ('delivery', 'pickup', 'dine_in'));