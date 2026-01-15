import { Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Delivery() {
  return (
    <div 
      className="space-y-6"
      data-testid="delivery-page"
      role="main"
      aria-label="Página de Delivery"
    >
      <div className="flex items-center gap-3">
        <Truck className="h-8 w-8 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground" data-testid="delivery-page-title">
          Delivery
        </h1>
      </div>
      
      <Card data-testid="delivery-card">
        <CardHeader>
          <CardTitle data-testid="delivery-card-title">Gestão de Entregas</CardTitle>
          <CardDescription data-testid="delivery-card-description">
            Acompanhe e gerencie suas entregas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p 
            className="text-muted-foreground"
            data-testid="delivery-coming-soon"
            role="status"
          >
            Em breve você poderá acompanhar suas entregas em tempo real aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
