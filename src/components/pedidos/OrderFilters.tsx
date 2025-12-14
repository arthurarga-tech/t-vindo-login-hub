import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/hooks/useOrders";

export interface OrderFiltersState {
  search: string;
  status: OrderStatus | "all";
  dateRange: "all" | "today" | "yesterday" | "week";
  showFinished: boolean;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  onChange: (filters: OrderFiltersState) => void;
}

const statusOptions: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Preparando" },
  { value: "ready", label: "Pronto" },
  { value: "out_for_delivery", label: "Saiu p/ Entrega" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

const dateOptions = [
  { value: "all", label: "Qualquer data" },
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "week", label: "Esta semana" },
];

export function OrderFilters({ filters, onChange }: OrderFiltersProps) {
  const hasActiveFilters = 
    filters.search || 
    filters.status !== "all" || 
    filters.dateRange !== "all" ||
    !filters.showFinished;

  const clearFilters = () => {
    onChange({
      search: "",
      status: "all",
      dateRange: "all",
      showFinished: true,
    });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) => onChange({ ...filters, status: value as OrderStatus | "all" })}
      >
        <SelectTrigger className="w-[180px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.dateRange}
        onValueChange={(value) => onChange({ ...filters, dateRange: value as typeof filters.dateRange })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Data" />
        </SelectTrigger>
        <SelectContent>
          {dateOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={filters.showFinished ? "outline" : "secondary"}
        size="sm"
        onClick={() => onChange({ ...filters, showFinished: !filters.showFinished })}
      >
        {filters.showFinished ? "Ocultar finalizados" : "Mostrar finalizados"}
      </Button>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
