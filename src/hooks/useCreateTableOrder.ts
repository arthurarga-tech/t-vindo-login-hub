import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TableOrderItem {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  observation?: string;
  addons: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

interface CreateTableOrderData {
  tableId: string;
  items: TableOrderItem[];
}

export function useCreateTableOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTableOrderData) => {
      const itemsPayload = data.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        observation: item.observation || null,
        addons: item.addons.map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
          quantity: a.quantity,
        })),
      }));

      const { data: result, error } = await supabase.rpc("create_table_order", {
        p_table_id: data.tableId,
        p_items: itemsPayload as any,
      });

      if (error) throw error;
      return result as any as { id: string; order_number: number; total: number };
    },
    onSuccess: (result) => {
      toast.success(`Pedido #${result.order_number} adicionado à mesa`);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      console.error("Error creating table order:", error);
      toast.error("Erro ao adicionar pedido à mesa");
    },
  });
}
