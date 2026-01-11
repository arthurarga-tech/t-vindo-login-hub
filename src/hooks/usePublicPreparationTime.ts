import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays } from "date-fns";
import { formatInSaoPaulo, getNowInSaoPaulo } from "@/lib/dateUtils";

interface PublicPreparationTimeResult {
  mode: "auto_daily" | "manual";
  preparationMinutes: number;
  deliveryMinutes: number;
  totalMinutes: number;
}

export function usePublicPreparationTime(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ["public-preparation-time", establishmentId],
    queryFn: async (): Promise<PublicPreparationTimeResult | null> => {
      if (!establishmentId) return null;

      // Get establishment config
      const { data: establishment, error: estError } = await supabase
        .from("establishments")
        .select("preparation_time_mode, manual_preparation_time, manual_delivery_time")
        .eq("id", establishmentId)
        .single();

      if (estError || !establishment) return null;

      const mode = (establishment.preparation_time_mode || "auto_daily") as "auto_daily" | "manual";
      const manualPrepTime = establishment.manual_preparation_time || 30;
      const manualDeliveryTime = establishment.manual_delivery_time || 30;

      // If manual mode, return configured values
      if (mode === "manual") {
        return {
          mode: "manual",
          preparationMinutes: manualPrepTime,
          deliveryMinutes: manualDeliveryTime,
          totalMinutes: manualPrepTime + manualDeliveryTime,
        };
      }

      // Auto daily mode: calculate from orders
      const now = getNowInSaoPaulo();
      const todayStart = formatInSaoPaulo(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
      const yesterdayStart = formatInSaoPaulo(startOfDay(subDays(now, 1)), "yyyy-MM-dd'T'HH:mm:ss");

      // Try today first
      let result = await calculatePublicAverage(establishmentId, todayStart);
      
      if (result) {
        return {
          mode: "auto_daily",
          preparationMinutes: result,
          deliveryMinutes: 0,
          totalMinutes: result,
        };
      }

      // Fallback to yesterday
      result = await calculatePublicAverage(establishmentId, yesterdayStart, todayStart);
      
      if (result) {
        return {
          mode: "auto_daily",
          preparationMinutes: result,
          deliveryMinutes: 0,
          totalMinutes: result,
        };
      }

      // Fallback to historical (last 30 days)
      const thirtyDaysAgo = formatInSaoPaulo(subDays(now, 30), "yyyy-MM-dd'T'HH:mm:ss");
      result = await calculatePublicAverage(establishmentId, thirtyDaysAgo);
      
      if (result) {
        return {
          mode: "auto_daily",
          preparationMinutes: result,
          deliveryMinutes: 0,
          totalMinutes: result,
        };
      }

      // No data - return default
      return {
        mode: "auto_daily",
        preparationMinutes: 30,
        deliveryMinutes: 0,
        totalMinutes: 30,
      };
    },
    enabled: !!establishmentId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

async function calculatePublicAverage(
  establishmentId: string,
  startDate: string,
  endDate?: string
): Promise<number | null> {
  // Get completed orders
  let query = supabase
    .from("orders")
    .select("id")
    .eq("establishment_id", establishmentId)
    .in("status", ["ready", "out_for_delivery", "delivered", "ready_for_pickup", "picked_up", "ready_to_serve", "served"])
    .gte("created_at", startDate);

  if (endDate) {
    query = query.lt("created_at", endDate);
  }

  const { data: orders, error: ordersError } = await query;
  if (ordersError || !orders || orders.length === 0) return null;

  const orderIds = orders.map((o) => o.id);

  // Get status history
  const { data: history, error: historyError } = await supabase
    .from("order_status_history")
    .select("order_id, status, created_at")
    .in("order_id", orderIds)
    .in("status", ["confirmed", "ready", "ready_for_pickup", "ready_to_serve"])
    .order("created_at", { ascending: true });

  if (historyError || !history || history.length === 0) return null;

  // Calculate preparation times
  const preparationTimes: number[] = [];

  orderIds.forEach((orderId) => {
    const orderHistory = history.filter((h) => h.order_id === orderId);
    const confirmedEntry = orderHistory.find((h) => h.status === "confirmed");
    const readyEntry = orderHistory.find(
      (h) => h.status === "ready" || h.status === "ready_for_pickup" || h.status === "ready_to_serve"
    );

    if (confirmedEntry && readyEntry) {
      const confirmedTime = new Date(confirmedEntry.created_at).getTime();
      const readyTime = new Date(readyEntry.created_at).getTime();
      const diffMinutes = (readyTime - confirmedTime) / (1000 * 60);

      if (diffMinutes > 1 && diffMinutes < 180) {
        preparationTimes.push(diffMinutes);
      }
    }
  });

  if (preparationTimes.length === 0) return null;

  return Math.round(preparationTimes.reduce((a, b) => a + b, 0) / preparationTimes.length);
}
