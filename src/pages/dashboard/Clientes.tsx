import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Clientes() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Base de Clientes</CardTitle>
          <CardDescription>Visualize e gerencie seus clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve você poderá visualizar seus clientes e histórico de pedidos aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
