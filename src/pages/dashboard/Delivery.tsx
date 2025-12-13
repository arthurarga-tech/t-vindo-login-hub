import { Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Delivery() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Delivery</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Entregas</CardTitle>
          <CardDescription>Acompanhe e gerencie suas entregas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve você poderá acompanhar suas entregas em tempo real aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
