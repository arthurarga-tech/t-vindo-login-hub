import { ShoppingCart, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { formatPrice } from "@/lib/formatters";

interface CartBarProps {
  isStoreOpen?: boolean;
  allowScheduling?: boolean;
}

export function CartBar({ isStoreOpen = true, allowScheduling = false }: CartBarProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { totalItems, totalPrice } = useCart();

  const handleClick = () => {
    if (!isStoreOpen && !allowScheduling) {
      toast.error("Estabelecimento fechado no momento. Consulte os horários de funcionamento.");
      return;
    }
    navigate(`/loja/${slug}/checkout`);
  };

  const getButtonText = () => {
    if (!isStoreOpen && allowScheduling) {
      return "Agendar Pedido";
    }
    return "Finalizar Pedido";
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-background border-t shadow-lg transition-all duration-300 ease-out ${
        totalItems === 0 
          ? "translate-y-full opacity-0 pointer-events-none" 
          : "translate-y-0 opacity-100"
      }`}
      data-testid="cart-bar"
      role="region"
      aria-label="Barra do carrinho"
    >
      <div className="max-w-4xl mx-auto">
        <Button 
          className={`w-full h-14 text-sm sm:text-base font-semibold ${!isStoreOpen && !allowScheduling ? 'opacity-70' : ''}`}
          size="lg"
          onClick={handleClick}
          style={{ 
            backgroundColor: `hsl(var(--store-primary, var(--primary)))`,
          }}
          data-testid="cart-bar-checkout-button"
          aria-label={`${getButtonText()} - ${totalItems} itens - ${formatPrice(totalPrice)}`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {!isStoreOpen && !allowScheduling ? (
                <>
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-base" data-testid="cart-bar-status">Fechado</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-base" data-testid="cart-bar-items-count">
                    {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                  </span>
                </>
              )}
            </div>
            <span className="text-xs sm:text-base" data-testid="cart-bar-total">
              {isStoreOpen || allowScheduling ? (
                <>
                  <span className="hidden sm:inline">{getButtonText()} • </span>
                  <span className="sm:hidden">{!isStoreOpen ? "Agendar • " : "Finalizar • "}</span>
                  {formatPrice(totalPrice)}
                </>
              ) : formatPrice(totalPrice)}
            </span>
          </div>
        </Button>
      </div>
    </div>
  );
}
