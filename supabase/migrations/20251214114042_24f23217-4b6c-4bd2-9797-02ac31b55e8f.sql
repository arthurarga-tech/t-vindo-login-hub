-- Add order_number column to orders table for human-readable order numbers
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number SERIAL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;