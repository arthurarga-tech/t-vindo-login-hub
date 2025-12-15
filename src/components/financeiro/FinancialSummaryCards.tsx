import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { FinancialSummary } from "@/hooks/useFinancial";

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function FinancialSummaryCards({ summary, isLoading }: FinancialSummaryCardsProps) {
  const cards = [
    {
      title: "Faturamento Bruto",
      value: summary.grossIncome,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Faturamento Líquido",
      value: summary.netIncome,
      icon: Wallet,
      color: "text-green-600",
      bgColor: "bg-green-100",
      subtitle: summary.totalFees > 0 ? `-${formatCurrency(summary.totalFees)} taxas` : undefined,
    },
    {
      title: "Despesas",
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Saldo",
      value: summary.balance,
      icon: PiggyBank,
      color: summary.balance >= 0 ? "text-green-600" : "text-red-600",
      bgColor: summary.balance >= 0 ? "bg-green-100" : "bg-red-100",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-8 bg-muted rounded w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>
                  {formatCurrency(card.value)}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
