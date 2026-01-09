import { useState } from "react";
import { Clock, User, MapPin, Phone, CreditCard, MessageSquare, X, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Order, OrderStatus, useUpdateOrderStatus, orderTypeLabels, getStatusFlow } from "@/hooks/useOrders";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { usePrintOrder } from "@/hooks/usePrintOrder";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { formatInSaoPaulo } from "@/lib/dateUtils";

// WhatsApp Icon Component
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  establishmentName: string;
  logoUrl?: string | null;
  printMode?: string;
  printFontSize?: number;
  printMarginLeft?: number;
  printMarginRight?: number;
  printFontBold?: boolean;
  printLineHeight?: number;
  printContrastHigh?: boolean;
}

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "destructive" },
  confirmed: { label: "Confirmado", variant: "default" },
  preparing: { label: "Preparando", variant: "secondary" },
  ready: { label: "Pronto", variant: "default" },
  out_for_delivery: { label: "Saiu p/ Entrega", variant: "secondary" },
  delivered: { label: "Entregue", variant: "outline" },
  ready_for_pickup: { label: "Pronto p/ Retirada", variant: "default" },
  picked_up: { label: "Retirado", variant: "outline" },
  ready_to_serve: { label: "Pronto p/ Servir", variant: "default" },
  served: { label: "Servido", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  cash: "Dinheiro",
};

export function OrderDetailModal({ order, open, onClose, establishmentName, logoUrl, printMode = "none", printFontSize = 12, printMarginLeft = 0, printMarginRight = 0, printFontBold = true, printLineHeight = 1.4, printContrastHigh = false }: OrderDetailModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const { printOrder } = usePrintOrder();
  const { sendNotification, openWhatsApp, isEnabled: isWhatsAppEnabled } = useWhatsAppNotification();

  if (!order) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const status = statusConfig[order.status as OrderStatus] || statusConfig.pending;
  const orderType = order.order_type || "delivery";
  const typeInfo = orderTypeLabels[orderType];
  const statusFlow = getStatusFlow(orderType);
  
  const currentStatusIndex = statusFlow.indexOf(order.status as OrderStatus);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < statusFlow.length - 1 
    ? statusFlow[currentStatusIndex + 1] 
    : null;
  const previousStatus = currentStatusIndex > 0 
    ? statusFlow[currentStatusIndex - 1] 
    : null;

  const handlePrint = async () => {
    console.log("[OrderDetailModal] handlePrint chamado");
    
    const result = await printOrder({
      order,
      establishmentName,
      logoUrl,
      printFontSize,
      printMarginLeft,
      printMarginRight,
      printFontBold,
      printLineHeight,
      printContrastHigh,
    });
    
    console.log("[OrderDetailModal] Resultado da impressão:", result);
    
    if (result.isMobile) {
      toast.info("Toque no botão verde para imprimir", {
        description: "Dispositivo móvel detectado - toque em 'Imprimir Pedido' na nova janela",
      });
    } else if (result.success) {
      toast.success("Pedido enviado para impressão");
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    // Block transitions from cancelled orders only
    if (order.status === "cancelled") {
      toast.error("Não é possível alterar o status de pedidos cancelados");
      return;
    }

    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: newStatus });
      toast.success(`Status atualizado para: ${statusConfig[newStatus].label}`);
      
      // Auto print on confirm if configured (browser_on_confirm or qz_on_confirm)
      const isPrintOnConfirm = printMode && printMode.includes("on_confirm");
      
      console.log("[OrderDetailModal] Verificando impressão automática", {
        printMode,
        newStatus,
        isPrintOnConfirm,
        isConfirmed: newStatus === "confirmed",
      });
      
      if (isPrintOnConfirm && newStatus === "confirmed") {
        console.log("[OrderDetailModal] DISPARANDO impressão automática ao confirmar pedido");
        
        try {
          await handlePrint();
          console.log("[OrderDetailModal] Impressão automática concluída");
        } catch (printError) {
          console.error("[OrderDetailModal] Erro na impressão automática:", printError);
          toast.error("Erro ao imprimir automaticamente");
        }
      }
      
      onClose(); // Fecha o modal para mostrar dados atualizados
    } catch (error) {
      console.error("[OrderDetailModal] Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleWhatsAppClick = () => {
    openWhatsApp(order, order.status as OrderStatus);
  };

  const nextStatusLabels: Record<OrderStatus, string> = {
    pending: "",
    confirmed: "Confirmar Pedido",
    preparing: "Iniciar Preparo",
    ready: "Marcar como Pronto",
    out_for_delivery: "Saiu para Entrega",
    delivered: "Marcar como Entregue",
    ready_for_pickup: "Pronto p/ Retirada",
    picked_up: "Marcar como Retirado",
    ready_to_serve: "Pronto p/ Servir",
    served: "Marcar como Servido",
    cancelled: "Cancelar",
  };

  const previousStatusLabels: Record<OrderStatus, string> = {
    pending: "Voltar para Pendente",
    confirmed: "Voltar para Confirmado",
    preparing: "Voltar para Preparando",
    ready: "Voltar para Pronto",
    out_for_delivery: "Voltar para Saiu p/ Entrega",
    delivered: "",
    ready_for_pickup: "Voltar para Pronto p/ Retirada",
    picked_up: "",
    ready_to_serve: "Voltar para Pronto p/ Servir",
    served: "",
    cancelled: "",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Pedido #{order.order_number}</span>
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="outline" className="ml-1">
                {typeInfo.icon} {typeInfo.label}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scheduled Order */}
          {(order as any).scheduled_for && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Pedido Agendado</p>
                <p className="text-sm">
                  {formatInSaoPaulo((order as any).scheduled_for, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {formatInSaoPaulo(order.created_at, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{paymentLabels[order.payment_method] || order.payment_method}</span>
              <span className="text-muted-foreground">• Pagamento na entrega</span>
            </div>
            {order.payment_method === "cash" && (order as any).change_for && (order as any).change_for > 0 && (
              <div className="pl-6 text-sm space-y-0.5">
                <p className="text-muted-foreground">
                  Troco para: <span className="font-medium text-foreground">{formatPrice((order as any).change_for)}</span>
                </p>
                <p className="text-primary font-medium">
                  Levar troco: {formatPrice((order as any).change_for - order.total)}
                </p>
              </div>
            )}
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
            <Button
              variant="outline"
              onClick={handlePrint}
              title="Imprimir pedido"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsAppClick}
              title="Conversar com cliente"
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </Button>
            {order.status !== "cancelled" && (
              <>
                {previousStatus && (
                  <Button 
                    variant="outline"
                    onClick={() => handleStatusChange(previousStatus)}
                    disabled={updateStatus.isPending}
                  >
                    {previousStatusLabels[previousStatus]}
                  </Button>
                )}
                {nextStatus && (
                  <Button 
                    className="flex-1"
                    onClick={() => handleStatusChange(nextStatus)}
                    disabled={updateStatus.isPending}
                  >
                    {nextStatusLabels[nextStatus]}
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={updateStatus.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pedido #{order.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pedido será marcado como cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                handleStatusChange("cancelled");
                setShowCancelConfirm(false);
              }}
            >
              Cancelar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
