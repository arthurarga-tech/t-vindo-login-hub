import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";

interface CloseTablePayment {
  method: string;
  amount: number;
}

interface CloseTableParams {
  tableId: string;
  payments: CloseTablePayment[];
}

export function useCloseTable() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async ({ tableId, payments }: CloseTableParams) => {
      const { error } = await supabase.rpc("close_table", {
        p_table_id: tableId,
        p_payments: JSON.parse(JSON.stringify(payments)),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", establishment?.id] });
      queryClient.invalidateQueries({ queryKey: ["orders", establishment?.id] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
    },
  });
}
