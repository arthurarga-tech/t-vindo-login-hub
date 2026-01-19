import { ShoppingCart, Plus, Minus, Trash2, Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatPrice } from "@/lib/formatters";

interface CartDrawerProps {
  isStoreOpen?: boolean;
  allowScheduling?: boolean;
}

export function CartDrawer({ isStoreOpen = true, allowScheduling = false }: CartDrawerProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline"
          size="sm"
          className={`relative h-7 sm:h-9 px-1.5 sm:px-3 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-primary-foreground/40 hover:border-primary-foreground/60 transition-all active:scale-95 ${totalItems > 0 ? 'ring-2 ring-primary-foreground/50' : ''}`}
          data-testid="cart-drawer-trigger"
          aria-label={`Carrinho com ${totalItems} itens`}
        >
          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="ml-1 text-[10px] sm:text-sm">Carrinho</span>
          {totalItems > 0 && (
            <Badge 
              className="absolute -top-1.5 -right-1.5 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs bg-destructive text-destructive-foreground animate-bounce"
              data-testid="cart-drawer-badge"
            >
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        className="flex flex-col w-full sm:max-w-md"
        data-testid="cart-drawer-content"
        role="dialog"
        aria-label="Carrinho de compras"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            Carrinho
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div 
            className="flex-1 flex items-center justify-center"
            data-testid="cart-drawer-empty"
          >
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div 
              className="flex-1 overflow-y-auto py-4 space-y-4"
              data-testid="cart-drawer-items"
              role="list"
              aria-label="Itens do carrinho"
            >
              {items.map((item, index) => {
                const addonsTotal = item.selectedAddons?.reduce((sum, a) => sum + a.price * a.quantity, 0) ?? 0;
                const itemPrice = item.product.price + addonsTotal;

                return (
                  <div 
                    key={`${item.product.id}-${index}`} 
                    className="flex gap-3"
                    data-testid={`cart-item-${index}`}
                    role="listitem"
                  >
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                        data-testid="cart-item-image"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 
                        className="font-medium text-sm line-clamp-2"
                        data-testid="cart-item-name"
                      >
                        {item.product.name}
                      </h4>
                      <p 
                        className="text-xs text-muted-foreground"
                        data-testid="cart-item-base-price"
                      >
                        {formatPrice(item.product.price)}
                      </p>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="mt-1 space-y-0.5" data-testid="cart-item-addons">
                          {item.selectedAddons.map((addon) => (
                            <p key={addon.id} className="text-xs text-muted-foreground">
                              + {addon.quantity}x {addon.name} ({formatPrice(addon.price * addon.quantity)})
                            </p>
                          ))}
                        </div>
                      )}
                      <p 
                        className="font-semibold text-sm mt-1" 
                        style={{ color: "hsl(var(--store-primary, var(--primary)))" }}
                        data-testid="cart-item-total-price"
                      >
                        {formatPrice(itemPrice)}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          data-testid="cart-item-decrease"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span 
                          className="text-sm font-medium w-6 text-center"
                          data-testid="cart-item-quantity"
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          data-testid="cart-item-increase"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive ml-auto"
                          onClick={() => removeItem(item.product.id, index)}
                          data-testid="cart-item-remove"
                          aria-label={`Remover ${item.product.name} do carrinho`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 space-y-4" data-testid="cart-drawer-footer">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold" data-testid="cart-drawer-subtotal">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              
              <SheetClose asChild>
                <Button 
                  className="w-full" 
                  size="lg" 
                  style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
                  onClick={() => {
                    if (!isStoreOpen && !allowScheduling) {
                      toast.error("Estabelecimento fechado no momento.");
                      return;
                    }
                    navigate(`/loja/${slug}/checkout`);
                  }}
                  disabled={!isStoreOpen && !allowScheduling}
                  data-testid="cart-drawer-checkout-button"
                  aria-label={!isStoreOpen && allowScheduling ? "Agendar pedido" : "Finalizar pedido"}
                >
                  {!isStoreOpen && allowScheduling ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Pedido
                    </>
                  ) : (
                    "Finalizar Pedido"
                  )}
                </Button>
              </SheetClose>
              
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={clearCart}
                data-testid="cart-drawer-clear-button"
                aria-label="Limpar carrinho"
              >
                Limpar carrinho
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
