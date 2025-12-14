
-- Drop old constraint and add updated one with all status values
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text, 
  'confirmed'::text, 
  'preparing'::text, 
  'ready'::text, 
  'out_for_delivery'::text, 
  'delivered'::text, 
  'ready_for_pickup'::text, 
  'picked_up'::text, 
  'ready_to_serve'::text, 
  'served'::text, 
  'cancelled'::text
]));
