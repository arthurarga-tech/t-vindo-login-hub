import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; image_url?: string | null }>;
  onSelectCategory: (categoryId: string | null) => void;
  activeCategory: string | null;
  stickyTop?: number;
}

export function CategoryFilter({ 
  categories, 
  onSelectCategory, 
  activeCategory,
  stickyTop = 120 
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to keep active category visible
  useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const button = activeButtonRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
        button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeCategory]);

  const handleSelect = (categoryId: string | null) => {
    onSelectCategory(categoryId);
    
    // Smooth scroll to section with offset for sticky header
    if (categoryId) {
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
        const headerOffset = stickyTop + 60; // sticky top + filter height
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div 
      className="sticky z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 py-2"
      style={{ top: `${stickyTop}px` }}
      data-testid="category-filter"
      role="navigation"
      aria-label="Filtro de categorias"
    >
      <div className="max-w-4xl mx-auto px-3">
        <div 
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          role="tablist"
          aria-label="Categorias disponíveis"
        >
          <Button
            ref={activeCategory === null ? activeButtonRef : null}
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            className="flex-shrink-0 h-9 min-w-[44px] text-sm font-medium transition-all"
            style={activeCategory === null ? { 
              backgroundColor: 'hsl(var(--store-primary, var(--primary)))',
              color: 'hsl(var(--primary-foreground))'
            } : undefined}
            onClick={() => handleSelect(null)}
            data-testid="category-filter-all"
            role="tab"
            aria-selected={activeCategory === null}
            aria-controls="store-page-categories"
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              ref={activeCategory === category.id ? activeButtonRef : null}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0 h-9 min-w-[44px] text-sm font-medium transition-all whitespace-nowrap"
              style={activeCategory === category.id ? { 
                backgroundColor: 'hsl(var(--store-primary, var(--primary)))',
                color: 'hsl(var(--primary-foreground))'
              } : undefined}
              onClick={() => handleSelect(category.id)}
              data-testid={`category-filter-${category.id}`}
              role="tab"
              aria-selected={activeCategory === category.id}
              aria-controls={`category-${category.id}`}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
