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
    <section
      data-testid={`category-section-${category.id}`}
      aria-labelledby={`category-title-${category.id}`}
    >
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-2 border-b border-[hsl(var(--store-secondary,var(--secondary))/0.2)]">
        {category.image_url && (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover ring-2 ring-[hsl(var(--store-primary,var(--primary))/0.3)]"
            data-testid="category-section-image"
          />
        )}
        <h2 
          id={`category-title-${category.id}`}
          className="text-lg sm:text-xl font-semibold text-[hsl(var(--store-secondary,var(--foreground)))]"
          data-testid="category-section-title"
        >
          {category.name}
        </h2>
      </div>
      
      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
        data-testid="category-section-products"
        role="list"
        aria-label={`Produtos da categoria ${category.name}`}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
