-- Allow public users to check if a customer already exists by phone (for checkout flow)
CREATE POLICY "Anyone can check customer by phone for checkout" 
ON public.customers 
FOR SELECT 
USING (true);