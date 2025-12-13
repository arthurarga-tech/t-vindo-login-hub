import { DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Financeiro() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Finanças</CardTitle>
          <CardDescription>Acompanhe o faturamento e despesas do seu negócio</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve você poderá visualizar seus relatórios financeiros aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
