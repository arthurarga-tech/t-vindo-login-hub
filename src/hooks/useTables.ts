import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { useEffect } from "react";
import type { Order } from "./useOrders";

export interface TableRecord {
  id: string;
  establishment_id: string;
  table_number: string;
  customer_id: string | null;
  customer_display_name: string | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  orders: Order[];
}

export function useTables() {
  const { data: establishment } = useEstablishment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tables", establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return [];

      const { data, error } = await supabase
        .from("tables")
        .select(`
          *,
          customer:customers(id, name, phone),
          orders!orders_table_id_fkey(
            *,
            customer:customers(*),
            items:order_items(
              *,
              addons:order_item_addons(*)
            )
          )
        `)
        .eq("establishment_id", establishment.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) as TableRecord[];
    },
    enabled: !!establishment?.id,
  });

  // Realtime subscription for tables and orders
  useEffect(() => {
    if (!establishment?.id) return;

    const channel = supabase
      .channel("tables-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tables", establishment.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tables", establishment.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment?.id, queryClient]);

  return query;
}

// Helper to compute total consumed for a table
export function getTableTotal(table: TableRecord): number {
  return table.orders
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);
}

// Helper to count items by status
export function getTableItemStatusCounts(table: TableRecord) {
  const counts = { pending: 0, preparing: 0, ready: 0, delivered: 0 };
  for (const order of table.orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items || []) {
      const status = (item as any).item_status || "pending";
      if (status in counts) counts[status as keyof typeof counts]++;
    }
  }
  return counts;
}
