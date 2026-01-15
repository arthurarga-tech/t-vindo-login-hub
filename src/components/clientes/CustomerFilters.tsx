import { Search, ArrowUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SortOption = "recent" | "orders" | "spent" | "name";

export interface CustomerFiltersState {
  search: string;
  neighborhood: string;
  sortBy: SortOption;
}

interface CustomerFiltersProps {
  filters: CustomerFiltersState;
  neighborhoods: string[];
  onChange: (filters: CustomerFiltersState) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "orders", label: "Mais pedidos" },
  { value: "spent", label: "Maior valor gasto" },
  { value: "name", label: "Nome A-Z" },
];

export function CustomerFilters({ filters, neighborhoods, onChange }: CustomerFiltersProps) {
  const hasActiveFilters = 
    filters.search || 
    filters.neighborhood || 
    filters.sortBy !== "recent";

  const clearFilters = () => {
    onChange({
      search: "",
      neighborhood: "",
      sortBy: "recent",
    });
  };

  return (
    <div 
      className="flex flex-wrap gap-3 items-center"
      data-testid="customer-filters"
      role="search"
      aria-label="Filtros de clientes"
    >
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
          data-testid="customer-filters-search-input"
          aria-label="Buscar clientes"
        />
      </div>

      {neighborhoods.length > 0 && (
        <Select
          value={filters.neighborhood}
          onValueChange={(value) => onChange({ ...filters, neighborhood: value === "all" ? "" : value })}
        >
          <SelectTrigger 
            className="w-[180px]"
            data-testid="customer-filters-neighborhood-select"
            aria-label="Filtrar por bairro"
          >
            <SelectValue placeholder="Bairro" />
          </SelectTrigger>
          <SelectContent data-testid="customer-filters-neighborhood-options">
            <SelectItem value="all">Todos os bairros</SelectItem>
            {neighborhoods.map((neighborhood) => (
              <SelectItem key={neighborhood} value={neighborhood}>
                {neighborhood}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.sortBy}
        onValueChange={(value) => onChange({ ...filters, sortBy: value as SortOption })}
      >
        <SelectTrigger 
          className="w-[180px]"
          data-testid="customer-filters-sort-select"
          aria-label="Ordenar clientes"
        >
          <ArrowUpDown className="h-4 w-4 mr-2" aria-hidden="true" />
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent data-testid="customer-filters-sort-options">
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          data-testid="customer-filters-clear-button"
          aria-label="Limpar filtros"
        >
          <X className="h-4 w-4 mr-1" aria-hidden="true" />
          Limpar
        </Button>
      )}
    </div>
  );
}
