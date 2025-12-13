import type { PublicProduct } from "@/hooks/usePublicStore";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

interface ProductCardProps {
  product: PublicProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="flex">
          <div className="flex-1 p-4">
            <h3 className="font-medium text-foreground line-clamp-2">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
            <p className="text-primary font-semibold mt-2">
              {formatPrice(product.price)}
            </p>
          </div>
          
          <div className="w-24 h-24 flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
