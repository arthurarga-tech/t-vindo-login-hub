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
import { hexToHSL } from "@/lib/formatters";

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
          isStoreOpen={isOpen}
          allowScheduling={(establishment as any).allow_scheduling}
        />
        
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
          {!isOpen && (
            <Alert variant="destructive" className="mb-4 sm:mb-6">
              <Clock className="h-4 w-4" />
              <AlertTitle className="text-sm sm:text-base">Estabelecimento Fechado</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
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
            <div className="space-y-6 sm:space-y-8">
              {[1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="h-6 sm:h-8 w-36 sm:w-48 mb-3 sm:mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-28 sm:h-32" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
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
        
        <CartBar isStoreOpen={isOpen} allowScheduling={(establishment as any).allow_scheduling} />
      </div>
    </CartProvider>
  );
}
