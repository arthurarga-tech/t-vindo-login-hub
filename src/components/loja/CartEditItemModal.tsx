import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageIcon, Plus, Minus } from "lucide-react";
import { usePublicAddonsForCategory } from "@/hooks/usePublicAddons";
import {
  ProductAddonSelector,
  SelectedAddon,
  validateAddonSelection,
} from "./ProductAddonSelector";
import { formatPrice } from "@/lib/formatters";
import { toast } from "sonner";
import type { CartItem, CartAddon } from "@/hooks/useCart";

interface CartEditItemModalProps {
  item: CartItem | null;
  itemIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (index: number, updatedItem: Partial<CartItem>) => void;
}

export function CartEditItemModal({
  item,
  itemIndex,
  open,
  onOpenChange,
  onSave,
}: CartEditItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [observation, setObservation] = useState("");

  const { data: addonData } = usePublicAddonsForCategory(item?.product?.category_id ?? undefined);
  const groups = addonData?.groups ?? [];
  const addons = addonData?.addons ?? [];

  // Initialize state when modal opens with item data
  useEffect(() => {
    if (item && open) {
      setQuantity(item.quantity);
      setObservation(item.observation || "");
      
      // Convert CartAddon[] to SelectedAddon[]
      const initialAddons: SelectedAddon[] = (item.selectedAddons || [])
        .map((cartAddon) => {
          const addon = addons.find((a) => a.id === cartAddon.id);
          if (addon) {
            return { addon, quantity: cartAddon.quantity };
          }
          return null;
        })
        .filter((sa): sa is SelectedAddon => sa !== null);
      
      setSelectedAddons(initialAddons);
    }
  }, [item, open, addons]);

  if (!item) return null;

  const product = item.product;
  const addonsTotal = selectedAddons.reduce(
    (sum, sa) => sum + sa.addon.price * sa.quantity,
    0
  );
  const itemTotal = (product.price + addonsTotal) * quantity;

  const handleSave = () => {
    const validation = validateAddonSelection(groups, selectedAddons);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    const cartAddons: CartAddon[] = selectedAddons.map((sa) => ({
      id: sa.addon.id,
      name: sa.addon.name,
      price: sa.addon.price,
      quantity: sa.quantity,
    }));

    onSave(itemIndex, {
      quantity,
      selectedAddons: cartAddons.length > 0 ? cartAddons : undefined,
      observation: observation.trim() || undefined,
    });

    toast.success("Item atualizado", { duration: 1500, position: "top-center" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        data-testid="cart-edit-item-modal"
        aria-describedby="cart-edit-item-description"
      >
        <DialogHeader>
          <DialogTitle 
            className="text-lg sm:text-xl pr-8"
            data-testid="cart-edit-item-title"
          >
            Editar: {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Product Image */}
          <div className="w-full h-32 sm:h-40 rounded-lg overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="cart-edit-item-image"
              />
            ) : (
              <div 
                className="w-full h-full bg-muted flex items-center justify-center"
                data-testid="cart-edit-item-placeholder"
              >
                <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Base Price */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">Preço base:</span>
            <span 
              className="text-base sm:text-lg font-semibold" 
              style={{ color: "hsl(var(--store-primary, var(--primary)))" }}
              data-testid="cart-edit-item-base-price"
            >
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Addons */}
          {groups.length > 0 && (
            <div className="border-t pt-4" data-testid="cart-edit-item-addons-section">
              <ProductAddonSelector
                groups={groups}
                addons={addons}
                selectedAddons={selectedAddons}
                onSelectionChange={setSelectedAddons}
              />
            </div>
          )}

          {/* Observation */}
          <div className="border-t pt-3 sm:pt-4 space-y-2">
            <Label 
              htmlFor="edit-observation" 
              className="text-xs sm:text-sm font-medium"
            >
              Observações (opcional)
            </Label>
            <Textarea
              id="edit-observation"
              placeholder="Digite aqui observações adicionais se necessário"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="resize-none text-sm"
              maxLength={200}
              rows={2}
              data-testid="cart-edit-item-observation"
              aria-label="Observações do produto"
            />
            <p 
              className="text-xs text-muted-foreground text-right"
              data-testid="cart-edit-item-observation-count"
            >
              {observation.length}/200
            </p>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between border-t pt-3 sm:pt-4">
            <span className="text-xs sm:text-sm font-medium">Quantidade:</span>
            <div 
              className="flex items-center gap-2 sm:gap-3"
              data-testid="cart-edit-item-quantity-selector"
              role="group"
              aria-label="Seletor de quantidade"
            >
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                data-testid="cart-edit-item-quantity-decrease"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span 
                className="w-8 text-center font-medium text-base sm:text-lg"
                data-testid="cart-edit-item-quantity-value"
              >
                {quantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => setQuantity(quantity + 1)}
                data-testid="cart-edit-item-quantity-increase"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            className="w-full text-sm sm:text-base min-h-[44px]" 
            size="lg" 
            style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
            onClick={handleSave}
            data-testid="cart-edit-item-save-button"
            aria-label={`Salvar alterações por ${formatPrice(itemTotal)}`}
          >
            Salvar {formatPrice(itemTotal)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
