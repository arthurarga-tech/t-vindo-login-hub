import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { getNowInSaoPaulo } from "@/lib/dateUtils";

interface CloseTabParams {
  orderId: string;
  paymentMethod: string;
}

export function useCloseTab() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({ orderId, paymentMethod }: CloseTabParams) => {
      const now = getNowInSaoPaulo().toISOString();

      // Update order: set payment, close tab, mark as served
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          payment_method: paymentMethod,
          is_open_tab: false,
          status: "served",
          updated_at: now,
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Add status history entry
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({ order_id: orderId, status: "served" });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-tables", establishment?.id] });
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
    },
  });
}
