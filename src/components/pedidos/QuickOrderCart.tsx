import { Plus, Minus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPrice } from "@/lib/formatters";

export interface QuickOrderCartItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  observation?: string;
  categoryId: string;
  addons: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

interface QuickOrderCartProps {
  items: QuickOrderCartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onEditItem: (item: QuickOrderCartItem) => void;
}

export function QuickOrderCart({ items, onUpdateQuantity, onRemoveItem, onEditItem }: QuickOrderCartProps) {
  const calculateItemTotal = (item: QuickOrderCartItem) => {
    const addonsTotal = item.addons.reduce((sum, addon) => sum + addon.price * addon.quantity, 0);
    return (item.productPrice + addonsTotal) * item.quantity;
  };

  const total = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  if (items.length === 0) {
    return (
      <Card data-testid="quick-order-cart-empty">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Nenhum item adicionado</p>
          <p className="text-sm">Selecione produtos na lista ao lado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="quick-order-cart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Carrinho</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3 p-4 pt-0">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2"
                data-testid={`quick-order-cart-item-${item.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.productName}</p>
                  {item.addons.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.addons.map((addon) => (
                        <span key={addon.id} className="block">
                          + {addon.quantity}x {addon.name} ({formatPrice(addon.price)})
                        </span>
                      ))}
                    </div>
                  )}
                  {item.observation && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      Obs: {item.observation}
                    </p>
                  )}
                  <p className="text-sm font-medium text-primary mt-1">
                    {formatPrice(calculateItemTotal(item))}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 min-h-[44px] min-w-[44px]"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    data-testid={`quick-order-cart-item-decrease-${item.id}`}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 min-h-[44px] min-w-[44px]"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    data-testid={`quick-order-cart-item-increase-${item.id}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 min-h-[44px] min-w-[44px]"
                    onClick={() => onEditItem(item)}
                    data-testid={`quick-order-cart-item-edit-${item.id}`}
                    aria-label="Editar item"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                    onClick={() => onRemoveItem(item.id)}
                    data-testid={`quick-order-cart-item-remove-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-4 flex justify-between items-center font-semibold">
          <span>Total:</span>
          <span className="text-primary text-lg" data-testid="quick-order-cart-total">
            {formatPrice(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
