import { useState } from "react";
import { CreditCard, Banknote, QrCode, Wallet } from "lucide-react";
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
import { Order } from "@/hooks/useOrders";
import { formatPrice } from "@/lib/formatters";
import { useCloseTab } from "@/hooks/useCloseTab";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CloseTabModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

const paymentOptions = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "debit", label: "Débito", icon: Wallet },
] as const;

export function CloseTabModal({ order, open, onClose }: CloseTabModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const closeTab = useCloseTab();

  if (!order) return null;

  const tableNumber = (order as any).table_number;

  const handleConfirm = async () => {
    if (!selectedMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    try {
      await closeTab.mutateAsync({
        orderId: order.id,
        paymentMethod: selectedMethod,
      });
      toast.success(`Mesa ${tableNumber || order.order_number} fechada com sucesso!`);
      setSelectedMethod("");
      onClose();
    } catch {
      toast.error("Erro ao fechar comanda");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedMethod("");
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Fechar Mesa {tableNumber || order.order_number}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Total da comanda:{" "}
                <span className="font-bold text-primary text-lg">
                  {formatPrice(order.total)}
                </span>
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Forma de pagamento:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedMethod === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedMethod(option.value)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!selectedMethod || closeTab.isPending}
          >
            {closeTab.isPending ? "Fechando..." : "Confirmar Fechamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
