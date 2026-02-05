import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { useEffect } from "react";
import type { Order } from "./useOrders";

export function useOpenTables() {
  const { data: establishment } = useEstablishment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["open-tables", establishment?.id],
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
        .eq("order_subtype", "table")
        .eq("is_open_tab", true)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!establishment?.id,
  });

  // Realtime subscription for table orders
  useEffect(() => {
    if (!establishment?.id) return;

    const channel = supabase
      .channel("open-tables-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `establishment_id=eq.${establishment.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["open-tables", establishment.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment?.id, queryClient]);

  return query;
}
