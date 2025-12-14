import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { usePublicAddonsForCategory } from "@/hooks/usePublicAddons";
import {
  ProductAddonSelector,
  SelectedAddon,
  validateAddonSelection,
} from "./ProductAddonSelector";
import type { PublicProduct } from "@/hooks/usePublicStore";

interface ProductDetailModalProps {
  product: PublicProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
}: ProductDetailModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  const { data: addonData } = usePublicAddonsForCategory(product?.category_id ?? undefined);
  const groups = addonData?.groups ?? [];
  const addons = addonData?.addons ?? [];

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelectedAddons([]);
    }
  }, [open, product]);

  if (!product) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const addonsTotal = selectedAddons.reduce(
    (sum, sa) => sum + sa.addon.price * sa.quantity,
    0
  );
  const itemTotal = (product.price + addonsTotal) * quantity;

  const handleAddToCart = () => {
    const validation = validateAddonSelection(groups, selectedAddons);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    const cartAddons = selectedAddons.map((sa) => ({
      id: sa.addon.id,
      name: sa.addon.name,
      price: sa.addon.price,
      quantity: sa.quantity,
    }));

    addItem(product, cartAddons.length > 0 ? cartAddons : undefined, quantity);
    toast.success(`${product.name} adicionado ao carrinho`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Image */}
          <div className="w-full h-48 rounded-lg overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}

          {/* Base Price */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Preço base:</span>
            <span className="text-lg font-semibold text-primary">
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Addons */}
          {groups.length > 0 && (
            <div className="border-t pt-4">
              <ProductAddonSelector
                groups={groups}
                addons={addons}
                selectedAddons={selectedAddons}
                onSelectionChange={setSelectedAddons}
              />
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm font-medium">Quantidade:</span>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Total and Add Button */}
          <Button className="w-full" size="lg" onClick={handleAddToCart}>
            Adicionar {formatPrice(itemTotal)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
