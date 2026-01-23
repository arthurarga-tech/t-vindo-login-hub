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
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { usePublicAddonsForProduct } from "@/hooks/usePublicAddons";
import {
  ProductAddonSelector,
  SelectedAddon,
  validateAddonSelection,
} from "./ProductAddonSelector";
import type { PublicProduct } from "@/hooks/usePublicStore";
import { formatPrice } from "@/lib/formatters";

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
  const [observation, setObservation] = useState("");

  const { data: addonData } = usePublicAddonsForProduct(product?.id, product?.category_id ?? undefined);
  const groups = addonData?.groups ?? [];
  const addons = addonData?.addons ?? [];

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelectedAddons([]);
      setObservation("");
    }
  }, [open, product]);

  if (!product) return null;

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

    addItem(product, cartAddons.length > 0 ? cartAddons : undefined, quantity, observation);
    toast.success(`${product.name} adicionado ao carrinho`, {
      duration: 1500,
      position: "top-center",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        data-testid="product-detail-modal"
        aria-describedby="product-detail-description"
      >
        <DialogHeader>
          <DialogTitle 
            className="text-lg sm:text-xl"
            data-testid="product-detail-title"
          >
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Product Image */}
          <div className="w-full h-40 sm:h-48 rounded-lg overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="product-detail-image"
              />
            ) : (
              <div 
                className="w-full h-full bg-muted flex items-center justify-center"
                data-testid="product-detail-placeholder"
              >
                <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p 
              className="text-xs sm:text-sm text-muted-foreground"
              id="product-detail-description"
              data-testid="product-detail-description"
            >
              {product.description}
            </p>
          )}

          {/* Base Price */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">Preço base:</span>
            <span 
              className="text-base sm:text-lg font-semibold" 
              style={{ color: "hsl(var(--store-primary, var(--primary)))" }}
              data-testid="product-detail-base-price"
            >
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Addons */}
          {groups.length > 0 && (
            <div className="border-t pt-4" data-testid="product-detail-addons-section">
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
              htmlFor="observation" 
              className="text-xs sm:text-sm font-medium"
            >
              Observações (opcional)
            </Label>
            <Textarea
              id="observation"
              placeholder="Digite aqui observações adicionais se necessário"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="resize-none text-sm"
              maxLength={200}
              rows={2}
              data-testid="product-detail-observation"
              aria-label="Observações do produto"
            />
            <p 
              className="text-xs text-muted-foreground text-right"
              data-testid="product-detail-observation-count"
            >
              {observation.length}/200
            </p>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between border-t pt-3 sm:pt-4">
            <span className="text-xs sm:text-sm font-medium">Quantidade:</span>
            <div 
              className="flex items-center gap-2 sm:gap-3"
              data-testid="product-detail-quantity-selector"
              role="group"
              aria-label="Seletor de quantidade"
            >
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                data-testid="product-detail-quantity-decrease"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span 
                className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base"
                data-testid="product-detail-quantity-value"
              >
                {quantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setQuantity(quantity + 1)}
                data-testid="product-detail-quantity-increase"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Total and Add Button */}
          <Button 
            className="w-full text-sm sm:text-base" 
            size="lg" 
            style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
            onClick={handleAddToCart}
            data-testid="product-detail-add-button"
            aria-label={`Adicionar ao carrinho por ${formatPrice(itemTotal)}`}
          >
            Adicionar {formatPrice(itemTotal)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
