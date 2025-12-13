import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Pedidos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>Gerencie todos os pedidos do seu estabelecimento</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve você poderá visualizar e gerenciar seus pedidos aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
