import { useState } from "react";
import type { PublicProduct } from "@/hooks/usePublicStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Plus } from "lucide-react";
import { ProductDetailModal } from "./ProductDetailModal";
import { formatPrice } from "@/lib/formatters";

interface ProductCardProps {
  product: PublicProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setModalOpen(true)}
        data-testid={`product-card-${product.id}`}
        role="article"
        aria-label={`Produto ${product.name}`}
      >
        <CardContent className="p-0">
          <div className="flex flex-row">
            {/* Image on the right side */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 order-2 flex-shrink-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-r-lg"
                  data-testid="product-card-image"
                />
              ) : (
                <div 
                  className="w-full h-full bg-muted flex items-center justify-center"
                  data-testid="product-card-placeholder"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex-1 p-3 sm:p-4 order-1">
              <h3 
                className="font-medium text-foreground line-clamp-2 text-sm sm:text-base"
                data-testid="product-card-name"
              >
                {product.name}
              </h3>
              {product.description && (
                <p 
                  className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2"
                  data-testid="product-card-description"
                >
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-2 gap-2">
                <p 
                  className="font-semibold text-sm sm:text-base" 
                  style={{ color: "hsl(var(--store-primary, var(--primary)))" }}
                  data-testid="product-card-price"
                >
                  {formatPrice(product.price)}
                </p>
                <Button 
                  size="sm" 
                  className="text-xs sm:text-sm h-8 sm:h-9" 
                  style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
                  onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
                  data-testid="product-card-add-button"
                  aria-label={`Adicionar ${product.name} ao carrinho`}
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProductDetailModal
        product={product}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
