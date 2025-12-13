import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Catalogo() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Catálogo</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Produtos e Serviços</CardTitle>
          <CardDescription>Gerencie seu catálogo de produtos e serviços</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve você poderá cadastrar e editar seus produtos aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
