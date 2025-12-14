import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";

export function usePreparationTime() {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["preparation-time", establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return null;

      // Get all orders that have been completed (ready, ready_for_pickup, ready_to_serve)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_type")
        .eq("establishment_id", establishment.id)
        .in("status", ["ready", "out_for_delivery", "delivered", "ready_for_pickup", "picked_up", "ready_to_serve", "served"]);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return null;

      const orderIds = orders.map(o => o.id);

      // Get status history for these orders
      const { data: history, error: historyError } = await supabase
        .from("order_status_history")
        .select("order_id, status, created_at")
        .in("order_id", orderIds)
        .in("status", ["confirmed", "ready", "ready_for_pickup", "ready_to_serve"])
        .order("created_at", { ascending: true });

      if (historyError) throw historyError;
      if (!history || history.length === 0) return null;

      // Calculate preparation times
      const preparationTimes: number[] = [];

      orderIds.forEach(orderId => {
        const orderHistory = history.filter(h => h.order_id === orderId);
        const confirmedEntry = orderHistory.find(h => h.status === "confirmed");
        const readyEntry = orderHistory.find(h => 
          h.status === "ready" || h.status === "ready_for_pickup" || h.status === "ready_to_serve"
        );

        if (confirmedEntry && readyEntry) {
          const confirmedTime = new Date(confirmedEntry.created_at).getTime();
          const readyTime = new Date(readyEntry.created_at).getTime();
          const diffMinutes = (readyTime - confirmedTime) / (1000 * 60);
          
          // Only consider reasonable times (between 1 minute and 3 hours)
          if (diffMinutes > 1 && diffMinutes < 180) {
            preparationTimes.push(diffMinutes);
          }
        }
      });

      if (preparationTimes.length === 0) return null;

      const average = preparationTimes.reduce((a, b) => a + b, 0) / preparationTimes.length;
      
      return {
        averageMinutes: Math.round(average),
        sampleSize: preparationTimes.length,
      };
    },
    enabled: !!establishment?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
