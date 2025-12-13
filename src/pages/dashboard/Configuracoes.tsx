import { Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>Configure as preferências do seu painel</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve você poderá personalizar suas configurações aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
