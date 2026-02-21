import { useState } from "react";
import { Clock, User, MapPin, Phone, CreditCard, MessageSquare, X, Printer, Pencil, Plus, Check } from "lucide-react";
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
import { Order, OrderItem, useUpdateOrderStatus, useUpdateOrderPaymentMethod } from "@/hooks/useOrders";
import { useEstablishment } from "@/hooks/useEstablishment";
import { 
  OrderStatus, 
  OrderType, 
  orderTypeLabels, 
  getStatusFlow,
  statusDisplayConfig,
  paymentMethodLabels,
  nextStatusButtonLabels,
  previousStatusButtonLabels 
} from "@/lib/orderStatus";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { usePrintOrder } from "@/hooks/usePrintOrder";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { formatPrice } from "@/lib/formatters";
import { OrderItemEditModal } from "./OrderItemEditModal";
import { OrderAddItemModal } from "./OrderAddItemModal";

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
  printAddonPrices?: boolean;
}

export function OrderDetailModal({ order, open, onClose, establishmentName, logoUrl, printMode = "none", printFontSize = 12, printMarginLeft = 0, printMarginRight = 0, printFontBold = true, printLineHeight = 1.4, printContrastHigh = false, printAddonPrices = true }: OrderDetailModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const updatePaymentMethod = useUpdateOrderPaymentMethod();
  const { data: establishment } = useEstablishment();
  const { printOrder, printInWindow } = usePrintOrder();
  const { openWhatsApp } = useWhatsAppNotification();
  
  // Check if order can be edited (not cancelled, delivered, picked_up, or served)
  const canEditOrder = order && !["cancelled", "delivered", "picked_up", "served"].includes(order.status);

  if (!order) return null;

  const status = statusDisplayConfig[order.status as OrderStatus] || statusDisplayConfig.pending;
  const orderType = (order.order_type || "delivery") as OrderType;
  const typeInfo = orderTypeLabels[orderType];
  const statusFlow = getStatusFlow(orderType);
  
  const currentStatusIndex = statusFlow.indexOf(order.status as OrderStatus);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < statusFlow.length - 1 
    ? statusFlow[currentStatusIndex + 1] 
    : null;
  const previousStatus = currentStatusIndex > 0 
    ? statusFlow[currentStatusIndex - 1] 
    : null;

  const handlePrint = () => {
    const result = printOrder({
      order,
      establishmentName,
      logoUrl,
      printFontSize,
      printMarginLeft,
      printMarginRight,
      printFontBold,
      printLineHeight,
      printContrastHigh,
      printAddonPrices,
    });
    
    if (result.success) {
      toast.success("Pedido enviado para impressão");
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (order.status === "cancelled") {
      toast.error("Não é possível alterar o status de pedidos cancelados");
      return;
    }

    const isPrintOnConfirm = printMode && printMode.includes("on_confirm");
    
    // Pre-open print window IMMEDIATELY on user gesture (before any await)
    // This preserves the user gesture context for mobile browsers / Rawbt
    let printWin: Window | null = null;
    if (isPrintOnConfirm && newStatus === "confirmed") {
      printWin = window.open("", "_blank");
    }

    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: newStatus });
      toast.success(`Status atualizado para: ${statusDisplayConfig[newStatus].label}`);
      
      // Print in pre-opened window after status update
      if (printWin && !printWin.closed) {
        printInWindow(printWin, {
          order,
          establishmentName,
          logoUrl,
          printFontSize,
          printMarginLeft,
          printMarginRight,
          printFontBold,
          printLineHeight,
          printContrastHigh,
          printAddonPrices,
        });
      }
      
      onClose();
    } catch (error) {
      // Close pre-opened window on error
      try { printWin?.close(); } catch { /* ignore */ }
      toast.error("Erro ao atualizar status");
    }
  };

  const handleWhatsAppClick = () => {
    openWhatsApp(order, order.status as OrderStatus);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="w-full h-full sm:max-w-lg sm:max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6"
        data-testid="order-detail-modal"
        role="dialog"
        aria-labelledby="order-detail-title"
      >
        <DialogHeader>
        <DialogTitle 
          id="order-detail-title"
          className="flex items-center justify-between"
          data-testid="order-detail-title"
        >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span data-testid="order-detail-number">Pedido #{order.order_number}</span>
              <Badge variant={status.variant} data-testid="order-detail-status">{status.label}</Badge>
              <Badge variant="outline" data-testid="order-detail-type">
                {typeInfo.icon} {typeInfo.label}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4" data-testid="order-detail-content">
          {/* Scheduled Order */}
          {(order as any).scheduled_for && (
            <div 
              className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg"
              data-testid="order-detail-scheduled"
            >
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
          <div 
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="order-detail-time"
          >
            <Clock className="h-4 w-4" />
            <span>
              {formatInSaoPaulo(order.created_at, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          <Separator />

          {/* Customer */}
          <div className="space-y-2" data-testid="order-detail-customer">
            <h4 className="font-semibold">Cliente</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2" data-testid="order-detail-customer-name">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer_display_name || order.customer?.name}</span>
              </div>
              <div className="flex items-center gap-2" data-testid="order-detail-customer-phone">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer?.phone}</span>
              </div>
              {order.customer?.address && (
                <div className="flex items-start gap-2" data-testid="order-detail-customer-address">
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
          <div className="space-y-2" data-testid="order-detail-items">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Itens</h4>
              {canEditOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddItemModal(true)}
                  className="h-7 text-xs gap-1"
                  data-testid="order-detail-add-item-button"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="space-y-1 group" data-testid={`order-detail-item-${item.id}`}>
                  <div className="flex justify-between text-sm items-start">
                    <div className="flex items-start gap-2 flex-1">
                      <span data-testid={`order-detail-item-${item.id}-name`}>{item.quantity}x {item.product_name}</span>
                      {canEditOrder && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => setEditingItem(item)}
                          data-testid={`order-detail-item-${item.id}-edit`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <span className="font-medium shrink-0" data-testid={`order-detail-item-${item.id}-total`}>{formatPrice(item.total)}</span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="pl-4 space-y-0.5" data-testid={`order-detail-item-${item.id}-addons`}>
                      {item.addons.map((addon) => (
                        <p key={addon.id} className="text-xs text-muted-foreground">
                          + {addon.quantity}x {addon.addon_name} ({formatPrice(addon.addon_price * addon.quantity)})
                        </p>
                      ))}
                    </div>
                  )}
                  {item.observation && (
                    <p className="text-xs text-muted-foreground pl-4 italic">
                      Obs: {item.observation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="space-y-2" data-testid="order-detail-totals">
            <div className="flex justify-between text-sm" data-testid="order-detail-subtotal">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm" data-testid="order-detail-delivery-fee">
                <span>Taxa de Entrega</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold" data-testid="order-detail-total">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment */}
          <div className="space-y-2" data-testid="order-detail-payment">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid="order-detail-payment-method">{paymentMethodLabels[order.payment_method] || order.payment_method}</span>
              {order.status !== "cancelled" && !editingPayment && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditingPayment(true)}
                  aria-label="Editar forma de pagamento"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {editingPayment && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                {[
                  { key: "pix", label: "Pix", enabled: establishment?.payment_pix_enabled },
                  { key: "credit", label: "Crédito", enabled: establishment?.payment_credit_enabled },
                  { key: "debit", label: "Débito", enabled: establishment?.payment_debit_enabled },
                  { key: "cash", label: "Dinheiro", enabled: establishment?.payment_cash_enabled },
                ].filter(m => m.enabled !== false).map(method => (
                  <Button
                    key={method.key}
                    variant={order.payment_method === method.key ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    disabled={updatePaymentMethod.isPending}
                    onClick={async () => {
                      if (method.key === order.payment_method) {
                        setEditingPayment(false);
                        return;
                      }
                      try {
                        await updatePaymentMethod.mutateAsync({ orderId: order.id, paymentMethod: method.key });
                        toast.success("Forma de pagamento atualizada");
                        setEditingPayment(false);
                      } catch {
                        toast.error("Erro ao atualizar pagamento");
                      }
                    }}
                  >
                    {order.payment_method === method.key && <Check className="h-3 w-3 mr-1" />}
                    {method.label}
                  </Button>
                ))}
              </div>
            )}
            {order.payment_method === "cash" && (order as any).change_for && (order as any).change_for > 0 && (
              <div className="pl-6 text-sm space-y-0.5" data-testid="order-detail-change">
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
              <div className="space-y-2" data-testid="order-detail-notes">
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
          <div className="flex flex-wrap gap-2" data-testid="order-detail-actions">
            <Button
              variant="outline"
              onClick={handlePrint}
              title="Imprimir pedido"
              className="min-h-[44px]"
              data-testid="order-detail-print-button"
              aria-label="Imprimir pedido"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsAppClick}
              title="Conversar com cliente"
              className="min-h-[44px] text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
              data-testid="order-detail-whatsapp-button"
              aria-label="Conversar com cliente via WhatsApp"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </Button>
            {order.status !== "cancelled" && (
              <>
                {previousStatus && (
                  <Button 
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => handleStatusChange(previousStatus)}
                    disabled={updateStatus.isPending}
                    data-testid="order-detail-previous-status-button"
                  >
                    {previousStatusButtonLabels[previousStatus]}
                  </Button>
                )}
                {nextStatus && (
                  <Button 
                    className="flex-1 min-h-[44px]"
                    onClick={() => handleStatusChange(nextStatus)}
                    disabled={updateStatus.isPending}
                    data-testid="order-detail-next-status-button"
                  >
                    {nextStatusButtonLabels[nextStatus]}
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  className="min-h-[44px]"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={updateStatus.isPending}
                  data-testid="order-detail-cancel-button"
                  aria-label="Cancelar pedido"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent data-testid="order-cancel-dialog" role="alertdialog">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="order-cancel-dialog-title">Cancelar pedido #{order.order_number}?</AlertDialogTitle>
            <AlertDialogDescription data-testid="order-cancel-dialog-description">
              Esta ação não pode ser desfeita. O pedido será marcado como cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="order-cancel-dialog-back">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                handleStatusChange("cancelled");
                setShowCancelConfirm(false);
              }}
              data-testid="order-cancel-dialog-confirm"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Item Modal */}
      <OrderItemEditModal
        item={editingItem}
        orderId={order.id}
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
      />

      {/* Add Item Modal */}
      <OrderAddItemModal
        orderId={order.id}
        open={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
      />
    </Dialog>
  );
}
