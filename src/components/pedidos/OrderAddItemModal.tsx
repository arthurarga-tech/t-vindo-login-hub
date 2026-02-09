import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductSelector, ProductSelectionResult } from "./ProductSelector";
import { useAddOrderItem, OrderItemAddonInput } from "@/hooks/useOrderItemMutations";
import { useEstablishment } from "@/hooks/useEstablishment";
import { toast } from "sonner";

interface OrderAddItemModalProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

export function OrderAddItemModal({ orderId, open, onClose }: OrderAddItemModalProps) {
  const { data: establishment } = useEstablishment();
  const addItem = useAddOrderItem();

  const handleSelect = async (data: ProductSelectionResult) => {
    const addonsData: OrderItemAddonInput[] = data.addons.map((a) => ({
      addon_id: a.id,
      addon_name: a.name,
      addon_price: a.price,
      quantity: a.quantity,
    }));

    try {
      await addItem.mutateAsync({
        orderId,
        item: {
          product_id: data.productId,
          product_name: data.productName,
          product_price: data.productPrice,
          quantity: data.quantity,
          observation: data.observation,
          addons: addonsData,
        },
      });
      toast.success("Item adicionado ao pedido");
      onClose();
    } catch {
      toast.error("Erro ao adicionar item");
    }
  };

  if (!establishment) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="w-full h-full sm:max-w-lg sm:max-h-[90vh] flex flex-col p-4 sm:p-6"
        data-testid="order-add-item-modal"
      >
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
        </DialogHeader>

        <ProductSelector
          establishmentId={establishment.id}
          onSelectProduct={handleSelect}
        />

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
