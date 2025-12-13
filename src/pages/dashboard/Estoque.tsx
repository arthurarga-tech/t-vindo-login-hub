import { Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Estoque() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Controle de Estoque</CardTitle>
          <CardDescription>Gerencie o estoque do seu estabelecimento</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve você poderá controlar entradas e saídas de estoque aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
