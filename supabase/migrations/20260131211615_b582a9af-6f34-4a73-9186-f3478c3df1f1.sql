-- Enable INSERT, UPDATE, DELETE for order_items (members only)
CREATE POLICY "Members can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

CREATE POLICY "Members can update order items"
ON public.order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

CREATE POLICY "Members can delete order items"
ON public.order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

-- Enable INSERT, UPDATE, DELETE for order_item_addons (members only)
CREATE POLICY "Members can create order item addons"
ON public.order_item_addons
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

CREATE POLICY "Members can update order item addons"
ON public.order_item_addons
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR is_establishment_owner(auth.uid(), o.establishment_id))
  )
);

CREATE POLICY "Members can delete order item addons"
ON public.order_item_addons
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND (is_establishment_member(auth.uid(), o.establishment_id) OR is_establishment_owner(auth.uid(), o.establishment_id))
  )
);