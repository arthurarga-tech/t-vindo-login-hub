import { Clock, User, MapPin, Phone, CreditCard, MessageSquare, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Order, OrderStatus, useUpdateOrderStatus } from "@/hooks/useOrders";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "destructive" },
  confirmed: { label: "Confirmado", variant: "default" },
  preparing: { label: "Preparando", variant: "secondary" },
  ready: { label: "Pronto", variant: "default" },
  out_for_delivery: { label: "Saiu p/ Entrega", variant: "secondary" },
  delivered: { label: "Entregue", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const statusFlow: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
};

export function OrderDetailModal({ order, open, onClose }: OrderDetailModalProps) {
  const updateStatus = useUpdateOrderStatus();

  if (!order) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const status = statusConfig[order.status as OrderStatus] || statusConfig.pending;
  const currentStatusIndex = statusFlow.indexOf(order.status as OrderStatus);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < statusFlow.length - 1 
    ? statusFlow[currentStatusIndex + 1] 
    : null;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    // Block invalid transitions from cancelled or delivered orders
    if (order.status === "cancelled" || order.status === "delivered") {
      toast.error("Não é possível alterar o status de pedidos finalizados");
      return;
    }

    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: newStatus });
      toast.success(`Status atualizado para: ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getNextStatusButton = () => {
    if (!nextStatus) return null;
    
    const labels: Record<OrderStatus, string> = {
      pending: "",
      confirmed: "Confirmar Pedido",
      preparing: "Iniciar Preparo",
      ready: "Marcar como Pronto",
      out_for_delivery: "Saiu para Entrega",
      delivered: "Marcar como Entregue",
      cancelled: "Cancelar",
    };

    return (
      <Button 
        className="flex-1"
        onClick={() => handleStatusChange(nextStatus)}
        disabled={updateStatus.isPending}
      >
        {labels[nextStatus]}
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Pedido #{order.order_number}</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          <Separator />

          {/* Customer */}
          <div className="space-y-2">
            <h4 className="font-semibold">Cliente</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer?.phone}</span>
              </div>
              {order.customer?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {order.customer.address === "Localização via WhatsApp" ? (
                      <span className="text-primary font-medium">📍 Localização via WhatsApp</span>
                    ) : (
                      <>
                        <p>{order.customer.address}, {order.customer.address_number}</p>
                        {order.customer.address_complement && (
                          <p className="text-muted-foreground">{order.customer.address_complement}</p>
                        )}
                        <p className="text-muted-foreground">
                          {order.customer.neighborhood}
                          {order.customer.city && `, ${order.customer.city}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            <h4 className="font-semibold">Itens</h4>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.product_name}</span>
                    <span className="font-medium">{formatPrice(item.total)}</span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="pl-4 space-y-0.5">
                      {item.addons.map((addon) => (
                        <p key={addon.id} className="text-xs text-muted-foreground">
                          + {addon.quantity}x {addon.addon_name} ({formatPrice(addon.addon_price * addon.quantity)})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment */}
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{paymentLabels[order.payment_method] || order.payment_method}</span>
            <span className="text-muted-foreground">• Pagamento na entrega</span>
          </div>

          {/* Notes */}
          {order.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Observações</h4>
                <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5" />
                  <span>{order.notes}</span>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <>
                {getNextStatusButton()}
                <Button 
                  variant="destructive" 
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={updateStatus.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
