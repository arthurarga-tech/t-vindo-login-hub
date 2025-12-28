import type { PublicProduct } from "@/hooks/usePublicStore";
import { ProductCard } from "./ProductCard";

interface CategorySectionProps {
  category: {
    id: string;
    name: string;
    image_url: string | null;
  };
  products: PublicProduct[];
}

export function CategorySection({ category, products }: CategorySectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        {category.image_url && (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
          />
        )}
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">{category.name}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
