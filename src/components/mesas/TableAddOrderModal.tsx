import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductSelector, ProductSelectionResult } from "@/components/pedidos/ProductSelector";
import { useCreateTableOrder } from "@/hooks/useCreateTableOrder";
import { useEstablishment } from "@/hooks/useEstablishment";
import { usePartialPrint } from "@/hooks/usePartialPrint";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TableRecord } from "@/hooks/useTables";

interface CartItem {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  observation?: string;
  addons: { id: string; name: string; price: number; quantity: number }[];
  total: number;
}

interface TableAddOrderModalProps {
  table: TableRecord;
  open: boolean;
  onClose: () => void;
}

export function TableAddOrderModal({ table, open, onClose }: TableAddOrderModalProps) {
  const { data: establishment } = useEstablishment();
  const createOrder = useCreateTableOrder();
  const { printPartial } = usePartialPrint();
  const [cart, setCart] = useState<CartItem[]>([]);

  const handleAddItem = (data: ProductSelectionResult) => {
    const addonsTotal = data.addons.reduce((s, a) => s + a.price * a.quantity, 0);
    const itemTotal = (data.productPrice + addonsTotal) * data.quantity;

    setCart((prev) => [
      ...prev,
      {
        product_id: data.productId,
        product_name: data.productName,
        product_price: data.productPrice,
        quantity: data.quantity,
        observation: data.observation,
        addons: data.addons.map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
          quantity: a.quantity,
        })),
        total: itemTotal,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((s, i) => s + i.total, 0);

  const handleConfirm = async () => {
    if (cart.length === 0) return;

    try {
      const result = await createOrder.mutateAsync({
        tableId: table.id,
        items: cart,
      });

      // Print partial receipt with only the new items
      printPartial({
        tableNumber: table.table_number,
        orderNumber: result.order_number,
        items: cart.map((item) => ({
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
          observation: item.observation,
          addons: item.addons.map((a) => ({
            name: a.name,
            price: a.price,
            quantity: a.quantity,
          })),
          total: item.total,
        })),
        total: cartTotal,
      });

      setCart([]);
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setCart([]);
    onClose();
  };

  if (!establishment) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-full h-full sm:max-w-lg sm:max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            Novo Pedido - Mesa {table.table_number}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          {cart.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {cart.length} {cart.length === 1 ? "item" : "itens"} — R$ {cartTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <ScrollArea className="max-h-32">
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span>
                      {item.quantity}x {item.product_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>R$ {item.total.toFixed(2).replace(".", ",")}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveItem(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          <div className="flex-1 overflow-auto min-h-0">
            <ProductSelector
              establishmentId={establishment.id}
              onSelectProduct={handleAddItem}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2 gap-2">
          <Button variant="outline" onClick={handleClose} className="min-h-[44px]">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={cart.length === 0 || createOrder.isPending}
            className="min-h-[44px]"
          >
            {createOrder.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirmar Pedido ({cart.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
