import { ShoppingCart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

export function CartBar() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { totalItems, totalPrice } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg">
      <div className="max-w-4xl mx-auto">
        <Button 
          className="w-full h-14 text-base font-semibold"
          size="lg"
          onClick={() => navigate(`/loja/${slug}/checkout`)}
          style={{ 
            backgroundColor: `hsl(var(--store-primary, var(--primary)))`,
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span>{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
            </div>
            <span>Finalizar Pedido • {formatPrice(totalPrice)}</span>
          </div>
        </Button>
      </div>
    </div>
  );
}