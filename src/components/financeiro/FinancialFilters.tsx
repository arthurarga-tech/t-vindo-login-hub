import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FinancialCategory } from "@/hooks/useFinancial";
import { DateRange } from "react-day-picker";

type PeriodType = "today" | "week" | "month" | "quarter" | "custom";

interface FinancialFiltersProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  type: "all" | "income" | "expense";
  onTypeChange: (type: "all" | "income" | "expense") => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
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
  categories,
  onAddExpense,
}: FinancialFiltersProps) {
  const handlePeriodChange = (newPeriod: PeriodType) => {
    onPeriodChange(newPeriod);
    const today = new Date();
    
    switch (newPeriod) {
      case "today":
        onDateRangeChange({ start: startOfDay(today), end: endOfDay(today) });
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
    { value: "week", label: "Semana" },
    { value: "month", label: "Mês" },
    { value: "quarter", label: "Trimestre" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Period buttons */}
        <div className="flex gap-1">
          {periodButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={period === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange(btn.value)}
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
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {period === "custom"
                ? `${format(dateRange.start, "dd/MM")} - ${format(dateRange.end, "dd/MM")}`
                : "Personalizado"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.start}
              selected={{ from: dateRange.start, to: dateRange.end }}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <Select value={type} onValueChange={(v) => onTypeChange(v as "all" | "income" | "expense")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Add expense button */}
        <Button onClick={onAddExpense} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Despesa
        </Button>
      </div>
    </div>
  );
}
