-- Add change_for column to orders table for cash payments
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS change_for numeric DEFAULT NULL;