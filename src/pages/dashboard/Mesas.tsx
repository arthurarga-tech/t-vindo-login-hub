import { useState } from "react";
import { UtensilsCrossed, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickOrderModal } from "@/components/pedidos/QuickOrderModal";
import { OrderDetailModal } from "@/components/pedidos/OrderDetailModal";
import { TableCard } from "@/components/mesas/TableCard";
import { TableAddOrderModal } from "@/components/mesas/TableAddOrderModal";
import { CloseTableModal } from "@/components/mesas/CloseTableModal";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useTables, type TableRecord } from "@/hooks/useTables";
import type { Order } from "@/hooks/useOrders";

export default function Mesas() {
  const { data: establishment } = useEstablishment();
  const { data: tables, isLoading } = useTables();
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [closingTable, setClosingTable] = useState<TableRecord | null>(null);
  const [addingToTable, setAddingToTable] = useState<TableRecord | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableRecord | null>(null);

  // When clicking a table card, show the most recent order detail
  const handleTableClick = (table: TableRecord) => {
    setSelectedTable(table);
    const activeOrders = table.orders.filter(o => o.status !== "cancelled");
    if (activeOrders.length > 0) {
      // Show the most recent order
      setSelectedOrder(activeOrders[0]);
    }
  };

  // When clicking "Novo Pedido" on a table, open the add order modal
  const handleAddOrder = (table: TableRecord) => {
    setAddingToTable(table);
  };

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tables && tables.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => handleTableClick(table)}
              onCloseTable={() => setClosingTable(table)}
              onAddOrder={() => handleAddOrder(table)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Nenhuma mesa aberta</h3>
          <p className="text-muted-foreground mt-1">
            Clique em "Nova Mesa" para abrir uma comanda.
          </p>
        </div>
      )}

      {establishment && (
        <>
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
          <OrderDetailModal
            order={selectedOrder}
            open={!!selectedOrder}
            onClose={() => { setSelectedOrder(null); setSelectedTable(null); }}
            establishmentName={establishment.name}
            logoUrl={establishment.logo_url}
            printMode={establishment.print_mode ?? "none"}
            printFontSize={establishment.print_font_size ?? 12}
            printMarginLeft={establishment.print_margin_left ?? 0}
            printMarginRight={establishment.print_margin_right ?? 0}
            printFontBold={establishment.print_font_bold ?? true}
            printLineHeight={establishment.print_line_height ?? 1.4}
            printContrastHigh={establishment.print_contrast_high ?? false}
            printAddonPrices={establishment.print_addon_prices ?? true}
          />
          <CloseTableModal
            table={closingTable}
            open={!!closingTable}
            onClose={() => setClosingTable(null)}
            paymentPixEnabled={establishment.payment_pix_enabled ?? false}
            paymentCreditEnabled={establishment.payment_credit_enabled ?? false}
            paymentDebitEnabled={establishment.payment_debit_enabled ?? false}
            paymentCashEnabled={establishment.payment_cash_enabled ?? false}
          />
          {addingToTable && (
            <TableAddOrderModal
              table={addingToTable}
              open={!!addingToTable}
              onClose={() => setAddingToTable(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
