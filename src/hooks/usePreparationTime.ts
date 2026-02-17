import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { startOfDay, subDays } from "date-fns";
import { formatInSaoPaulo, getNowInSaoPaulo } from "@/lib/dateUtils";

interface PreparationTimeResult {
  mode: "auto_daily" | "manual";
  preparationMinutes: number;
  deliveryMinutes: number;
  totalMinutes: number;
  sampleSize: number;
  isFromToday: boolean;
}

export function usePreparationTime() {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["preparation-time", establishment?.id],
    queryFn: async (): Promise<PreparationTimeResult | null> => {
      if (!establishment?.id) return null;

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
          sampleSize: 0,
          isFromToday: false,
        };
      }

      // Auto daily mode: calculate from orders
      const now = getNowInSaoPaulo();
      const todayStart = formatInSaoPaulo(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
      const yesterdayStart = formatInSaoPaulo(startOfDay(subDays(now, 1)), "yyyy-MM-dd'T'HH:mm:ss");

      // Try to get today's completed orders first
      let result = await calculateAverageForPeriod(establishment.id, todayStart);
      
      if (result) {
        return {
          mode: "auto_daily",
          preparationMinutes: result.averageMinutes,
          deliveryMinutes: 0,
          totalMinutes: result.averageMinutes,
          sampleSize: result.sampleSize,
          isFromToday: true,
        };
      }

      // Fallback to yesterday
      result = await calculateAverageForPeriod(establishment.id, yesterdayStart, todayStart);
      
      if (result) {
        return {
          mode: "auto_daily",
          preparationMinutes: result.averageMinutes,
          deliveryMinutes: 0,
          totalMinutes: result.averageMinutes,
          sampleSize: result.sampleSize,
          isFromToday: false,
        };
      }

      // Fallback to historical average (last 30 days)
      result = await calculateHistoricalAverage(establishment.id);
      
      if (result) {
        return {
          mode: "auto_daily",
          preparationMinutes: result.averageMinutes,
          deliveryMinutes: 0,
          totalMinutes: result.averageMinutes,
          sampleSize: result.sampleSize,
          isFromToday: false,
        };
      }

      // No data available - return default
      return {
        mode: "auto_daily",
        preparationMinutes: 30,
        deliveryMinutes: 0,
        totalMinutes: 30,
        sampleSize: 0,
        isFromToday: false,
      };
    },
    enabled: !!establishment?.id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

async function calculateAverageForPeriod(
  establishmentId: string,
  startDate: string,
  endDate?: string
): Promise<{ averageMinutes: number; sampleSize: number } | null> {
  // Get orders completed in this period
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

  // Get status history for these orders
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
}

async function calculateHistoricalAverage(
  establishmentId: string
): Promise<{ averageMinutes: number; sampleSize: number } | null> {
  const thirtyDaysAgo = formatInSaoPaulo(subDays(getNowInSaoPaulo(), 30), "yyyy-MM-dd'T'HH:mm:ss");
  return calculateAverageForPeriod(establishmentId, thirtyDaysAgo);
}
