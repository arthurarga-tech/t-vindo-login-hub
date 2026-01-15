import { Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Estoque() {
  return (
    <div 
      className="space-y-6"
      data-testid="estoque-page"
      role="main"
      aria-label="Página de Estoque"
    >
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground" data-testid="estoque-page-title">
          Estoque
        </h1>
      </div>
      
      <Card data-testid="estoque-card">
        <CardHeader>
          <CardTitle data-testid="estoque-card-title">Controle de Estoque</CardTitle>
          <CardDescription data-testid="estoque-card-description">
            Gerencie o estoque do seu estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p 
            className="text-muted-foreground"
            data-testid="estoque-coming-soon"
            role="status"
          >
            Em breve você poderá controlar entradas e saídas de estoque aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
