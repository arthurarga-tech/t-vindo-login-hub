import { useState } from "react";
import { CreditCard, Banknote, QrCode, Wallet, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableRecord, getTableTotal } from "@/hooks/useTables";
import { formatPrice } from "@/lib/formatters";
import { useCloseTable } from "@/hooks/useCloseTable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CloseTableModalProps {
  table: TableRecord | null;
  open: boolean;
  onClose: () => void;
  paymentCashEnabled?: boolean;
  paymentPixEnabled?: boolean;
  paymentCreditEnabled?: boolean;
  paymentDebitEnabled?: boolean;
}

const allPaymentOptions = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "debit", label: "Débito", icon: Wallet },
] as const;

interface PaymentEntry {
  method: string;
  amount: string;
}

export function CloseTableModal({
  table,
  open,
  onClose,
  paymentCashEnabled = true,
  paymentPixEnabled = true,
  paymentCreditEnabled = true,
  paymentDebitEnabled = true,
}: CloseTableModalProps) {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const closeTable = useCloseTable();

  if (!table) return null;

  const total = getTableTotal(table);
  const orderCount = table.orders.filter(o => o.status !== "cancelled").length;

  const enabledOptions = allPaymentOptions.filter((o) => {
    if (o.value === "cash") return paymentCashEnabled;
    if (o.value === "pix") return paymentPixEnabled;
    if (o.value === "credit") return paymentCreditEnabled;
    if (o.value === "debit") return paymentDebitEnabled;
    return true;
  });

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = total - totalPaid;

  const addPayment = (method: string) => {
    // Default amount is the remaining balance
    const amt = remaining > 0 ? remaining.toFixed(2) : "0";
    setPayments([...payments, { method, amount: amt }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePaymentAmount = (index: number, amount: string) => {
    const updated = [...payments];
    updated[index].amount = amount;
    setPayments(updated);
  };

  const handleConfirm = async () => {
    if (payments.length === 0) {
      toast.error("Adicione pelo menos uma forma de pagamento");
      return;
    }

    if (Math.abs(remaining) > 0.01) {
      toast.error("O valor total pago deve ser igual ao total consumido");
      return;
    }

    try {
      await closeTable.mutateAsync({
        tableId: table.id,
        payments: payments.map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
        })),
      });
      toast.success(`Mesa ${table.table_number} fechada com sucesso!`);
      setPayments([]);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao fechar mesa");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPayments([]);
      onClose();
    }
  };

  const getOptionLabel = (method: string) => {
    return allPaymentOptions.find(o => o.value === method)?.label || method;
  };

  const getOptionIcon = (method: string) => {
    const opt = allPaymentOptions.find(o => o.value === method);
    return opt ? opt.icon : Banknote;
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Fechar Mesa {table.table_number}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {orderCount} {orderCount === 1 ? "pedido" : "pedidos"}
                </span>
                <span className="font-bold text-primary text-lg">
                  Total: {formatPrice(total)}
                </span>
              </div>

              {/* Payments list */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Pagamentos:</p>
                  {payments.map((payment, index) => {
                    const Icon = getOptionIcon(payment.method);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm min-w-[70px]">{getOptionLabel(payment.method)}</span>
                        <div className="flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={payment.amount}
                            onChange={(e) => updatePaymentAmount(index, e.target.value)}
                            className="h-8 text-sm"
                            placeholder="0,00"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removePayment(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add payment buttons */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Adicionar pagamento:</p>
                <div className="grid grid-cols-2 gap-2">
                  {enabledOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => addPayment(option.value)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-colors text-left",
                          "border-border hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{option.label}</span>
                        <Plus className="h-3 w-3 ml-auto text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remaining balance */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border-2",
                Math.abs(remaining) <= 0.01
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : remaining > 0
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                    : "border-destructive bg-destructive/10"
              )}>
                <span className="text-sm font-medium">
                  {Math.abs(remaining) <= 0.01
                    ? "✅ Valores conferem"
                    : remaining > 0
                      ? "Falta pagar"
                      : "Excedente"}
                </span>
                <Badge variant={Math.abs(remaining) <= 0.01 ? "default" : "destructive"}>
                  {formatPrice(Math.abs(remaining))}
                </Badge>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={payments.length === 0 || Math.abs(remaining) > 0.01 || closeTable.isPending}
          >
            {closeTable.isPending ? "Fechando..." : "Confirmar Fechamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
