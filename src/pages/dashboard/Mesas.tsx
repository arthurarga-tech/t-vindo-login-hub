import { UtensilsCrossed } from "lucide-react";

export default function Mesas() {
  return (
    <div className="space-y-6" data-testid="mesas-page">
      <div className="flex items-center gap-3">
        <UtensilsCrossed className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Mesas / Comandas</h1>
      </div>
      <p className="text-muted-foreground">
        Gerencie os pedidos das mesas do seu estabelecimento.
      </p>
    </div>
  );
}
