import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { getNowInSaoPaulo } from "@/lib/dateUtils";

export interface OrderItemAddonInput {
  addon_id: string;
  addon_name: string;
  addon_price: number;
  quantity: number;
}

export interface OrderItemInput {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  observation?: string;
  addons?: OrderItemAddonInput[];
}

// Add a new item to an existing order
export function useAddOrderItem() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({
      orderId,
      item,
    }: {
      orderId: string;
      item: OrderItemInput;
    }) => {
      const addonsTotal = item.addons?.reduce(
        (sum, a) => sum + a.addon_price * a.quantity,
        0
      ) || 0;
      const itemTotal = (item.product_price + addonsTotal) * item.quantity;

      // Insert order item
      const { data: orderItem, error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
          observation: item.observation || null,
          total: itemTotal,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Insert addons if any
      if (item.addons && item.addons.length > 0) {
        const addonsData = item.addons.map((addon) => ({
          order_item_id: orderItem.id,
          addon_id: addon.addon_id,
          addon_name: addon.addon_name,
          addon_price: addon.addon_price,
          quantity: addon.quantity,
        }));

        const { error: addonsError } = await supabase
          .from("order_item_addons")
          .insert(addonsData);

        if (addonsError) throw addonsError;
      }

      // Update order totals
      await recalculateOrderTotals(orderId);

      return orderItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
    },
  });
}

// Update an existing order item (quantity, observation, addons)
export function useUpdateOrderItem() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({
      orderItemId,
      orderId,
      quantity,
      observation,
      addons,
      productPrice,
    }: {
      orderItemId: string;
      orderId: string;
      quantity: number;
      observation?: string;
      addons?: OrderItemAddonInput[];
      productPrice: number;
    }) => {
      const addonsTotal = addons?.reduce(
        (sum, a) => sum + a.addon_price * a.quantity,
        0
      ) || 0;
      const itemTotal = (productPrice + addonsTotal) * quantity;

      // Update order item
      const { error: updateError } = await supabase
        .from("order_items")
        .update({
          quantity,
          observation: observation || null,
          total: itemTotal,
        })
        .eq("id", orderItemId);

      if (updateError) throw updateError;

      // Delete existing addons and re-insert
      await supabase
        .from("order_item_addons")
        .delete()
        .eq("order_item_id", orderItemId);

      if (addons && addons.length > 0) {
        const addonsData = addons.map((addon) => ({
          order_item_id: orderItemId,
          addon_id: addon.addon_id,
          addon_name: addon.addon_name,
          addon_price: addon.addon_price,
          quantity: addon.quantity,
        }));

        const { error: addonsError } = await supabase
          .from("order_item_addons")
          .insert(addonsData);

        if (addonsError) throw addonsError;
      }

      // Recalculate order totals
      await recalculateOrderTotals(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
    },
  });
}

// Delete an order item
export function useDeleteOrderItem() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({
      orderItemId,
      orderId,
    }: {
      orderItemId: string;
      orderId: string;
    }) => {
      // Delete addons first (cascade should handle this but let's be explicit)
      await supabase
        .from("order_item_addons")
        .delete()
        .eq("order_item_id", orderItemId);

      // Delete order item
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", orderItemId);

      if (error) throw error;

      // Recalculate order totals
      await recalculateOrderTotals(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
    },
  });
}

// Helper function to recalculate order totals
async function recalculateOrderTotals(orderId: string) {
  // Fetch all items for this order
  const { data: items, error: fetchError } = await supabase
    .from("order_items")
    .select("total")
    .eq("order_id", orderId);

  if (fetchError) throw fetchError;

  const subtotal = items?.reduce((sum, item) => sum + Number(item.total), 0) || 0;

  // Get current order to preserve delivery_fee
  const { data: order, error: orderFetchError } = await supabase
    .from("orders")
    .select("delivery_fee")
    .eq("id", orderId)
    .single();

  if (orderFetchError) throw orderFetchError;

  const deliveryFee = Number(order?.delivery_fee || 0);
  const total = subtotal + deliveryFee;

  // Update order
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      subtotal,
      total,
      updated_at: getNowInSaoPaulo().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) throw updateError;
}
