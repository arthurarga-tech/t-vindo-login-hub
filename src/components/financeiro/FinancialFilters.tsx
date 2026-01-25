import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FinancialCategory } from "@/hooks/useFinancial";
import { DateRange } from "react-day-picker";
import { getNowInSaoPaulo, startOfDayInSaoPaulo, endOfDayInSaoPaulo } from "@/lib/dateUtils";

type PeriodType = "today" | "yesterday" | "week" | "month" | "quarter" | "custom";

interface FinancialFiltersProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  type: "all" | "income" | "expense";
  onTypeChange: (type: "all" | "income" | "expense") => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (paymentMethod: string) => void;
  categories: FinancialCategory[];
  onAddExpense: () => void;
}

export function FinancialFilters({
  period,
  onPeriodChange,
  dateRange,
  onDateRangeChange,
  type,
  onTypeChange,
  categoryId,
  onCategoryChange,
  paymentMethod,
  onPaymentMethodChange,
  categories,
  onAddExpense,
}: FinancialFiltersProps) {
  const handlePeriodChange = (newPeriod: PeriodType) => {
    onPeriodChange(newPeriod);
    const today = getNowInSaoPaulo();
    
    switch (newPeriod) {
      case "today":
        onDateRangeChange({ start: startOfDayInSaoPaulo(today), end: endOfDayInSaoPaulo(today) });
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        onDateRangeChange({ start: startOfDayInSaoPaulo(yesterday), end: endOfDayInSaoPaulo(yesterday) });
        break;
      case "week":
        onDateRangeChange({ start: startOfWeek(today, { locale: ptBR }), end: endOfWeek(today, { locale: ptBR }) });
        break;
      case "month":
        onDateRangeChange({ start: startOfMonth(today), end: endOfMonth(today) });
        break;
      case "quarter":
        onDateRangeChange({ start: startOfQuarter(today), end: endOfQuarter(today) });
        break;
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onPeriodChange("custom");
      onDateRangeChange({
        start: range.from,
        end: range.to || range.from,
      });
    }
  };

  const periodButtons: { value: PeriodType; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "yesterday", label: "Ontem" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mês" },
    { value: "quarter", label: "Trimestre" },
  ];

  return (
    <div 
      className="flex flex-col gap-4"
      data-testid="financial-filters"
      role="search"
      aria-label="Filtros financeiros"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Period buttons */}
        <div className="flex gap-1" data-testid="financial-filters-period-buttons">
          {periodButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={period === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange(btn.value)}
              data-testid={`financial-filters-period-${btn.value}`}
              aria-pressed={period === btn.value}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Date range picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={period === "custom" ? "default" : "outline"}
              size="sm"
              className={cn("justify-start text-left font-normal")}
              data-testid="financial-filters-date-picker-trigger"
              aria-label="Selecionar período personalizado"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {period === "custom"
                ? dateRange.start.getTime() === dateRange.end.getTime() || format(dateRange.start, "dd/MM") === format(dateRange.end, "dd/MM")
                  ? format(dateRange.start, "dd/MM")
                  : `${format(dateRange.start, "dd/MM")} - ${format(dateRange.end, "dd/MM")}`
                : "Personalizado"}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align="start"
            data-testid="financial-filters-date-picker-content"
          >
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.start}
              selected={{ from: dateRange.start, to: dateRange.end }}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={ptBR}
              className="pointer-events-auto"
              data-testid="financial-filters-calendar"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <Select value={type} onValueChange={(v) => onTypeChange(v as "all" | "income" | "expense")}>
          <SelectTrigger 
            className="w-[150px]"
            data-testid="financial-filters-type-trigger"
            aria-label="Filtrar por tipo"
          >
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent data-testid="financial-filters-type-content">
            <SelectItem value="all" data-testid="financial-filters-type-all">Todos</SelectItem>
            <SelectItem value="income" data-testid="financial-filters-type-income">Receitas</SelectItem>
            <SelectItem value="expense" data-testid="financial-filters-type-expense">Despesas</SelectItem>
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger 
            className="w-[180px]"
            data-testid="financial-filters-category-trigger"
            aria-label="Filtrar por categoria"
          >
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent data-testid="financial-filters-category-content">
            <SelectItem value="all" data-testid="financial-filters-category-all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem 
                key={cat.id} 
                value={cat.id}
                data-testid={`financial-filters-category-${cat.id}`}
              >
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Payment method filter */}
        <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
          <SelectTrigger 
            className="w-[150px]"
            data-testid="financial-filters-payment-trigger"
            aria-label="Filtrar por forma de pagamento"
          >
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent data-testid="financial-filters-payment-content">
            <SelectItem value="all" data-testid="financial-filters-payment-all">Todos</SelectItem>
            <SelectItem value="pix" data-testid="financial-filters-payment-pix">Pix</SelectItem>
            <SelectItem value="credit" data-testid="financial-filters-payment-credit">Crédito</SelectItem>
            <SelectItem value="debit" data-testid="financial-filters-payment-debit">Débito</SelectItem>
            <SelectItem value="cash" data-testid="financial-filters-payment-cash">Dinheiro</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Add expense button */}
        <Button 
          onClick={onAddExpense} 
          className="gap-2"
          data-testid="financial-filters-add-expense-button"
          aria-label="Adicionar nova despesa"
        >
          <Plus className="h-4 w-4" />
          Nova Despesa
        </Button>
      </div>
    </div>
  );
}
