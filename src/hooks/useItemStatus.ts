import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";

export type ItemStatus = "pending" | "preparing" | "ready" | "delivered";

export const itemStatusFlow: ItemStatus[] = ["pending", "preparing", "ready", "delivered"];

export const itemStatusConfig: Record<ItemStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pendente", variant: "secondary", color: "bg-yellow-500" },
  preparing: { label: "Preparando", variant: "default", color: "bg-orange-500" },
  ready: { label: "Pronto", variant: "default", color: "bg-green-500" },
  delivered: { label: "Entregue", variant: "outline", color: "bg-green-600" },
};

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: ItemStatus }) => {
      const { error } = await supabase
        .from("order_items")
        .update({ item_status: status })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
      queryClient.invalidateQueries({ queryKey: ["tables", establishment?.id] });
    },
  });
}
