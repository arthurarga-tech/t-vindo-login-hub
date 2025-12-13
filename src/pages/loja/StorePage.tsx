import { useParams } from "react-router-dom";
import { usePublicEstablishment, usePublicCategories, usePublicProducts } from "@/hooks/usePublicStore";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { CategorySection } from "@/components/loja/CategorySection";
import { AlertCircle } from "lucide-react";

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: establishment, isLoading: loadingEstablishment } = usePublicEstablishment(slug);
  const { data: categories, isLoading: loadingCategories } = usePublicCategories(establishment?.id);
  const { data: products, isLoading: loadingProducts } = usePublicProducts(establishment?.id);

  const isLoading = loadingEstablishment || loadingCategories || loadingProducts;

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

  const uncategorizedProducts = products?.filter((p) => !p.category_id) || [];

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader establishmentName={establishment.name} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
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

            {uncategorizedProducts.length > 0 && (
              <CategorySection
                category={{ id: "uncategorized", name: "Outros", image_url: null }}
                products={uncategorizedProducts}
              />
            )}

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
    </div>
  );
}
