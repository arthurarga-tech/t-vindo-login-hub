import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickOrderCustomer {
  name: string;
  phone: string;
}

interface QuickOrderItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  observation?: string;
  addons: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

interface QuickOrderData {
  establishmentId: string;
  customer: QuickOrderCustomer;
  items: QuickOrderItem[];
  paymentMethod: string;
  notes?: string;
  changeFor?: number;
  orderSubtype?: "counter" | "table";
  tableNumber?: string;
}

export function useCreateQuickOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuickOrderData) => {
      const subtype = data.orderSubtype || "counter";
      const isTable = subtype === "table";

      // 1. Create or update customer
      const { data: customerId, error: customerError } = await supabase.rpc(
        "create_or_update_public_customer",
        {
          p_establishment_id: data.establishmentId,
          p_name: data.customer.name,
          p_phone: data.customer.phone || "",
          p_address: null,
          p_address_number: null,
          p_address_complement: null,
          p_neighborhood: null,
          p_city: null,
        }
      );

      if (customerError) throw customerError;

      // Update customer order_origin
      if (customerId) {
        await supabase
          .from("customers")
          .update({ order_origin: subtype === "table" ? "table" : "counter" })
          .eq("id", customerId);
      }

      // 2. Calculate totals
      const subtotal = data.items.reduce((sum, item) => {
        const addonsTotal = item.addons.reduce((a, addon) => a + addon.price * addon.quantity, 0);
        return sum + (item.productPrice + addonsTotal) * item.quantity;
      }, 0);

      // 3. Create order
      const { data: orderResult, error: orderError } = await supabase.rpc(
        "create_public_order",
        {
          p_establishment_id: data.establishmentId,
          p_customer_id: customerId,
          p_payment_method: data.paymentMethod,
          p_order_type: "dine_in",
          p_subtotal: subtotal,
          p_delivery_fee: 0,
          p_total: subtotal,
          p_notes: data.notes || null,
          p_change_for: data.changeFor || null,
          p_scheduled_for: null,
        }
      );

      if (orderError) throw orderError;

      const orderId = (orderResult as any).id;
      const orderNumber = (orderResult as any).order_number;

      // 4. Update order with subtype-specific fields
      const orderUpdate: Record<string, any> = {
        order_subtype: subtype,
      };
      if (isTable) {
        orderUpdate.table_number = data.tableNumber || null;
        orderUpdate.is_open_tab = true;
        // Table orders stay as 'pending'
      } else {
        // Counter orders go straight to ready_to_serve
        orderUpdate.status = "ready_to_serve";
      }
      
      await supabase.from("orders").update(orderUpdate).eq("id", orderId);

      // If counter, add status history entry for ready_to_serve
      if (!isTable) {
        await supabase.from("order_status_history").insert({
          order_id: orderId,
          status: "ready_to_serve",
        });
      }

      // 5. Create order items
      const orderItemsData = data.items.map((item, index) => {
        const addonsTotal = item.addons.reduce((a, addon) => a + addon.price * addon.quantity, 0);
        return {
          index: index.toString(),
          order_id: orderId,
          product_id: item.productId,
          product_name: item.productName,
          product_price: item.productPrice,
          quantity: item.quantity,
          total: (item.productPrice + addonsTotal) * item.quantity,
          observation: item.observation || null,
        };
      });

      const { data: insertedItemsResult, error: itemsError } = await supabase.rpc(
        "create_public_order_items",
        { p_items: orderItemsData }
      );

      if (itemsError) throw itemsError;

      // 6. Map inserted items by index
      const insertedItemsMap = new Map<string, string>();
      if (Array.isArray(insertedItemsResult)) {
        insertedItemsResult.forEach((item: any) => {
          insertedItemsMap.set(item.index, item.id);
        });
      }

      // 7. Create order item addons
      const orderItemAddonsData: any[] = [];

      data.items.forEach((item, index) => {
        if (item.addons.length > 0) {
          const orderItemId = insertedItemsMap.get(index.toString());
          if (orderItemId) {
            item.addons.forEach((addon) => {
              orderItemAddonsData.push({
                order_item_id: orderItemId,
                addon_id: addon.id,
                addon_name: addon.name,
                addon_price: addon.price,
                quantity: addon.quantity,
              });
            });
          }
        }
      });

      if (orderItemAddonsData.length > 0) {
        const { error: addonsError } = await supabase.rpc(
          "create_public_order_item_addons",
          { p_addons: orderItemAddonsData }
        );

        if (addonsError) throw addonsError;
      }

      return { orderId, orderNumber, isTable };
    },
    onSuccess: (result, variables) => {
      if (result.isTable) {
        toast.success(`Comanda #${result.orderNumber} aberta - Mesa ${variables.tableNumber}`);
      } else {
        toast.success(`Pedido #${result.orderNumber} criado com sucesso!`);
      }
      queryClient.invalidateQueries({ queryKey: ["orders", variables.establishmentId] });
    },
    onError: (error) => {
      console.error("Error creating quick order:", error);
      toast.error("Erro ao criar pedido");
    },
  });
}
