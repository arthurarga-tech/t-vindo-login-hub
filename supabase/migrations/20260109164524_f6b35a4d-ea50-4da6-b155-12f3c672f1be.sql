-- Allow establishment members/owners to insert order status history
CREATE POLICY "Members can create order status history" 
ON public.order_status_history 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_status_history.order_id
    AND (
      public.is_establishment_member(auth.uid(), o.establishment_id) 
      OR public.is_establishment_owner(auth.uid(), o.establishment_id)
    )
  )
);