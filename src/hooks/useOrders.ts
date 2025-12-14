import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { useEffect } from "react";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  addons?: {
    id: string;
    addon_name: string;
    addon_price: number;
    quantity: number;
  }[];
}

export interface Order {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    address_number: string | null;
    address_complement: string | null;
    neighborhood: string | null;
    city: string | null;
  };
  items: OrderItem[];
}

export function useOrders() {
  const { data: establishment } = useEstablishment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["orders", establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(*),
          items:order_items(
            *,
            addons:order_item_addons(*)
          )
        `)
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!establishment?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!establishment?.id) return;

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        () => {
          // Refetch orders when any change happens
          queryClient.invalidateQueries({ queryKey: ["orders", establishment.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment?.id, queryClient]);

  return query;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Add to status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({ order_id: orderId, status });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
    },
  });
}
