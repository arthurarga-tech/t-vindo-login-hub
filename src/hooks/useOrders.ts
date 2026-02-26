import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { useEffect, useMemo } from "react";
import { getNowInSaoPaulo } from "@/lib/dateUtils";
import { 
  orderTypeLabels, 
  getStatusFlow 
} from "@/lib/orderStatus";
import type { OrderStatus, OrderType } from "@/lib/orderStatus";

// Re-export for backwards compatibility
export type { OrderStatus, OrderType };
export { orderTypeLabels, getStatusFlow };

const ORDERS_PAGE_SIZE = 50;

export interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  observation?: string | null;
  item_status?: string;
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
  order_type: OrderType;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_display_name: string | null;
  table_id?: string | null;
  table_number?: string | null;
  order_subtype?: string | null;
  is_open_tab?: boolean | null;
  scheduled_for?: string | null;
  change_for?: number | null;
  table?: {
    id: string;
    table_number: string;
    status: string;
  } | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    address_number: string | null;
    address_complement: string | null;
    neighborhood: string | null;
    city: string | null;
  } | null;
  items: OrderItem[];
}


export function useOrders() {
  const { data: establishment } = useEstablishment();
  const queryClient = useQueryClient();

  const infiniteQuery = useInfiniteQuery({
    queryKey: ["orders", establishment?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!establishment?.id) return { orders: [], nextOffset: null };

      const from = pageParam;
      const to = from + ORDERS_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(*),
          table:tables(id, table_number, status),
          items:order_items(
            *,
            addons:order_item_addons(*)
          )
        `)
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      const orders = data as Order[];
      const nextOffset = orders.length === ORDERS_PAGE_SIZE ? from + ORDERS_PAGE_SIZE : null;
      
      return { orders, nextOffset };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!establishment?.id,
  });

  // Flatten all pages into a single array
  const allOrders = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap(page => page.orders) ?? [];
  }, [infiniteQuery.data]);

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
          queryClient.invalidateQueries({ queryKey: ["orders", establishment.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment?.id, queryClient]);

  return {
    data: allOrders,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    refetch: infiniteQuery.refetch,
  };
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status, updated_at: getNowInSaoPaulo().toISOString() })
        .eq("id", orderId);

      if (orderError) throw orderError;

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

export function useUpdateOrderPaymentMethod() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({ orderId, paymentMethod }: { orderId: string; paymentMethod: string }) => {
      // 1. Update order payment_method
      const { error: orderError } = await supabase
        .from("orders")
        .update({ payment_method: paymentMethod, updated_at: getNowInSaoPaulo().toISOString() })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // 2. Check if there's already a financial transaction for this order
      const { data: transactions, error: txError } = await supabase
        .from("financial_transactions")
        .select("id, gross_amount")
        .eq("order_id", orderId);

      if (txError) throw txError;

      if (transactions && transactions.length > 0) {
        // Recalculate fees based on new payment method
        const creditFee = establishment?.card_credit_fee ?? 0;
        const debitFee = establishment?.card_debit_fee ?? 0;

        for (const tx of transactions) {
          let feeAmount = 0;
          if (paymentMethod === "credit") {
            feeAmount = tx.gross_amount * (creditFee / 100);
          } else if (paymentMethod === "debit") {
            feeAmount = tx.gross_amount * (debitFee / 100);
          }
          const netAmount = tx.gross_amount - feeAmount;

          const { error: updateError } = await supabase
            .from("financial_transactions")
            .update({ payment_method: paymentMethod, fee_amount: feeAmount, net_amount: netAmount })
            .eq("id", tx.id);

          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
    },
  });
}
