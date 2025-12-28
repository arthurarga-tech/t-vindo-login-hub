import { ShoppingCart, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

interface CartBarProps {
  isStoreOpen?: boolean;
}

export function CartBar({ isStoreOpen = true }: CartBarProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { totalItems, totalPrice } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const handleClick = () => {
    if (!isStoreOpen) {
      toast.error("Estabelecimento fechado no momento. Consulte os horários de funcionamento.");
      return;
    }
    navigate(`/loja/${slug}/checkout`);
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-background border-t shadow-lg transition-all duration-300 ease-out ${
        totalItems === 0 
          ? "translate-y-full opacity-0 pointer-events-none" 
          : "translate-y-0 opacity-100"
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <Button 
          className={`w-full h-12 sm:h-14 text-sm sm:text-base font-semibold ${!isStoreOpen ? 'opacity-70' : ''}`}
          size="lg"
          onClick={handleClick}
          style={{ 
            backgroundColor: `hsl(var(--store-primary, var(--primary)))`,
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {!isStoreOpen ? (
                <>
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-base">Fechado</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-base">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
                </>
              )}
            </div>
            <span className="text-xs sm:text-base">
              {isStoreOpen ? (
                <>
                  <span className="hidden sm:inline">Finalizar Pedido • </span>
                  <span className="sm:hidden">Finalizar • </span>
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