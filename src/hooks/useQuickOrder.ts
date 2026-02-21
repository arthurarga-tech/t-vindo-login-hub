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

interface QuickOrderCustomerAddress {
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
}

interface QuickOrderData {
  establishmentId: string;
  customer: QuickOrderCustomer;
  customerAddress?: QuickOrderCustomerAddress;
  items: QuickOrderItem[];
  paymentMethod: string;
  notes?: string;
  changeFor?: number;
  orderSubtype?: "counter" | "table" | "delivery";
  tableNumber?: string;
  deliveryFee?: number;
}

export function useCreateQuickOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuickOrderData) => {
      const subtype = data.orderSubtype || "counter";
      const isTable = subtype === "table";
      const isDelivery = subtype === "delivery";

      // 0. Validate duplicate table number
      if (isTable && data.tableNumber) {
        const { data: existingTables, error: tableCheckError } = await supabase
          .from("orders")
          .select("id, order_number")
          .eq("establishment_id", data.establishmentId)
          .eq("order_subtype", "table")
          .eq("is_open_tab", true)
          .eq("table_number", data.tableNumber.trim())
          .not("status", "eq", "cancelled");

        if (tableCheckError) throw tableCheckError;

        if (existingTables && existingTables.length > 0) {
          throw new Error(`DUPLICATE_TABLE:${data.tableNumber.trim()}`);
        }
      }

      // 1. Create or update customer (with address for delivery)
      const addr = data.customerAddress;
      const { data: customerId, error: customerError } = await supabase.rpc(
        "create_or_update_public_customer",
        {
          p_establishment_id: data.establishmentId,
          p_name: data.customer.name,
          p_phone: data.customer.phone || "",
          p_address: addr?.address || null,
          p_address_number: addr?.addressNumber || null,
          p_address_complement: addr?.addressComplement || null,
          p_neighborhood: addr?.neighborhood || null,
          p_city: addr?.city || null,
        }
      );

      if (customerError) throw customerError;

      // Update customer order_origin
      if (customerId) {
        const origin = isTable ? "table" : isDelivery ? "delivery" : "counter";
        await supabase
          .from("customers")
          .update({ order_origin: origin })
          .eq("id", customerId);
      }

      // 2. Calculate totals
      const subtotal = data.items.reduce((sum, item) => {
        const addonsTotal = item.addons.reduce((a, addon) => a + addon.price * addon.quantity, 0);
        return sum + (item.productPrice + addonsTotal) * item.quantity;
      }, 0);

      const deliveryFeeValue = isDelivery ? (data.deliveryFee || 0) : 0;
      const totalAmount = subtotal + deliveryFeeValue;

      // 3. Create order
      const orderType = isDelivery ? "delivery" : "dine_in";
      const { data: orderResult, error: orderError } = await supabase.rpc(
        "create_public_order",
        {
          p_establishment_id: data.establishmentId,
          p_customer_id: customerId,
          p_payment_method: data.paymentMethod,
          p_order_type: orderType,
          p_subtotal: subtotal,
          p_delivery_fee: deliveryFeeValue,
          p_total: totalAmount,
          p_notes: data.notes || null,
          p_change_for: data.changeFor || null,
          p_scheduled_for: null,
        }
      );

      if (orderError) throw orderError;

      const orderId = (orderResult as any).id;
      const orderNumber = (orderResult as any).order_number;

      // 4. Update order with subtype-specific fields and display name
      const orderUpdate: Record<string, any> = {
        order_subtype: isDelivery ? null : subtype,
      };
      // Store typed name for counter/table orders without phone
      if (!data.customer.phone?.trim() && data.customer.name?.trim()) {
        orderUpdate.customer_display_name = data.customer.name.trim();
      }
      if (isTable) {
        orderUpdate.table_number = data.tableNumber || null;
        orderUpdate.is_open_tab = true;
      }

      await supabase.from("orders").update(orderUpdate).eq("id", orderId);

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

      return { orderId, orderNumber, isTable, isDelivery };
    },
    onSuccess: (result, variables) => {
      if (result.isTable) {
        toast.success(`Comanda #${result.orderNumber} aberta - Mesa ${variables.tableNumber}`);
      } else if (result.isDelivery) {
        toast.success(`Pedido #${result.orderNumber} de entrega criado!`);
      } else {
        toast.success(`Pedido #${result.orderNumber} criado com sucesso!`);
      }
      queryClient.invalidateQueries({ queryKey: ["orders", variables.establishmentId] });
    },
    onError: (error) => {
      console.error("Error creating quick order:", error);
      if (error.message?.startsWith("DUPLICATE_TABLE:")) {
        const tableNum = error.message.split(":")[1];
        toast.error(`Já existe uma comanda aberta para Mesa ${tableNum}`);
      } else {
        toast.error("Erro ao criar pedido");
      }
    },
  });
}
