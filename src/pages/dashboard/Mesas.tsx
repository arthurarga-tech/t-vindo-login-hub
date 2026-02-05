import { useState } from "react";
import { UtensilsCrossed, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickOrderModal } from "@/components/pedidos/QuickOrderModal";
import { useEstablishment } from "@/hooks/useEstablishment";

export default function Mesas() {
  const { data: establishment } = useEstablishment();
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  return (
    <div className="space-y-6" data-testid="mesas-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Mesas / Comandas</h1>
        </div>
        <Button onClick={() => setQuickOrderOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Mesa
        </Button>
      </div>
      <p className="text-muted-foreground">
        Gerencie os pedidos das mesas do seu estabelecimento.
      </p>

      {establishment && (
        <QuickOrderModal
          open={quickOrderOpen}
          onClose={() => setQuickOrderOpen(false)}
          establishmentId={establishment.id}
          serviceTableEnabled={true}
          defaultSubtype="table"
          paymentPixEnabled={establishment.payment_pix_enabled ?? false}
          paymentCreditEnabled={establishment.payment_credit_enabled ?? false}
          paymentDebitEnabled={establishment.payment_debit_enabled ?? false}
          paymentCashEnabled={establishment.payment_cash_enabled ?? false}
        />
      )}
    </div>
  );
}
