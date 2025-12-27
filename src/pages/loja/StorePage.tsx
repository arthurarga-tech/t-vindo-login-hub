import { useParams } from "react-router-dom";
import { usePublicEstablishment, usePublicCategories, usePublicProducts } from "@/hooks/usePublicStore";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { StoreInfo } from "@/components/loja/StoreInfo";
import { CategorySection } from "@/components/loja/CategorySection";
import { CartBar } from "@/components/loja/CartBar";
import { CartProvider } from "@/hooks/useCart";
import { AlertCircle, Clock } from "lucide-react";
import { useMemo } from "react";
import { useStoreOpeningHours } from "@/hooks/useStoreOpeningHours";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Convert hex to HSL for CSS variables
function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: establishment, isLoading: loadingEstablishment } = usePublicEstablishment(slug);
  const { data: categories, isLoading: loadingCategories } = usePublicCategories(establishment?.id);
  const { data: products, isLoading: loadingProducts } = usePublicProducts(establishment?.id);
  
  const { isOpen, nextOpenTime } = useStoreOpeningHours((establishment as any)?.opening_hours);

  const isLoading = loadingEstablishment || loadingCategories || loadingProducts;

  // Generate custom CSS variables for theme
  const customStyles = useMemo(() => {
    const primaryColor = (establishment as any)?.theme_primary_color || "#ea580c";
    const secondaryColor = (establishment as any)?.theme_secondary_color || "#1e293b";
    
    return {
      "--store-primary": hexToHSL(primaryColor),
      "--store-secondary": hexToHSL(secondaryColor),
    } as React.CSSProperties;
  }, [establishment]);

  if (loadingEstablishment) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-64 mx-auto mb-8" />
          <div className="space-y-8">
            {[1, 2].map((i) => (
              <div key={i}>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-32" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Loja não encontrada</h1>
          <p className="text-muted-foreground">
            Verifique o endereço e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  const productsByCategory = categories?.reduce((acc, category) => {
    acc[category.id] = products?.filter((p) => p.category_id === category.id) || [];
    return acc;
  }, {} as Record<string, typeof products>);

  return (
    <CartProvider establishmentSlug={slug || ""}>
      <div className="min-h-screen bg-background" style={customStyles}>
        <StoreHeader 
          establishmentName={establishment.name}
          logoUrl={(establishment as any).logo_url}
          bannerUrl={(establishment as any).banner_url}
          phone={(establishment as any).phone}
          openingHours={(establishment as any).opening_hours}
          primaryColor={(establishment as any).theme_primary_color}
        />
        
        <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
          {!isOpen && (
            <Alert variant="destructive" className="mb-6">
              <Clock className="h-4 w-4" />
              <AlertTitle>Estabelecimento Fechado</AlertTitle>
              <AlertDescription>
                {nextOpenTime
                  ? `Abrimos ${nextOpenTime.day} às ${nextOpenTime.time}`
                  : "Consulte os horários de funcionamento abaixo"}
              </AlertDescription>
            </Alert>
          )}
          <StoreInfo
            description={(establishment as any).description}
            phone={(establishment as any).phone}
            address={(establishment as any).address}
            neighborhood={(establishment as any).neighborhood}
            city={(establishment as any).city}
            openingHours={(establishment as any).opening_hours}
            deliveryInfo={(establishment as any).delivery_info}
            minOrderValue={(establishment as any).min_order_value}
          />
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="h-8 w-48 mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-32" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {categories?.map((category) => {
                const categoryProducts = productsByCategory?.[category.id] || [];
                if (categoryProducts.length === 0) return null;
                
                return (
                  <CategorySection
                    key={category.id}
                    category={category}
                    products={categoryProducts}
                  />
                );
              })}


              {(!products || products.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhum produto disponível no momento.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
        
        <CartBar isStoreOpen={isOpen} />
      </div>
    </CartProvider>
  );
}
