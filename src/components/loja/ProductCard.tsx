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
      >
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Image first on mobile, right side on desktop */}
            <div className="w-full h-32 sm:w-24 sm:h-24 sm:order-2 flex-shrink-0">
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
            
            <div className="flex-1 p-3 sm:p-4 sm:order-1">
              <h3 className="font-medium text-foreground line-clamp-2 text-sm sm:text-base">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-2 gap-2">
                <p className="font-semibold text-sm sm:text-base" style={{ color: "hsl(var(--store-primary, var(--primary)))" }}>
                  {formatPrice(product.price)}
                </p>
                <Button 
                  size="sm" 
                  className="text-xs sm:text-sm h-8 sm:h-9" 
                  style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
                  onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
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
