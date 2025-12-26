import { Clock, User, MapPin, Phone, CreditCard, MessageSquare, Truck, Package, UtensilsCrossed, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Order, OrderStatus, OrderType, orderTypeLabels } from "@/hooks/useOrders";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toSaoPauloTime } from "@/lib/dateUtils";

interface OrderCardProps {
  order: Order;
  onClick: () => void;
  onQuickStatusChange?: (order: Order, newStatus: OrderStatus) => void;
  nextStatus?: OrderStatus | null;
  compact?: boolean;
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

const nextStatusLabels: Record<OrderStatus, string> = {
  pending: "Confirmar",
  confirmed: "Preparar",
  preparing: "Pronto",
  ready: "Saiu Entrega",
  out_for_delivery: "Entregue",
  delivered: "",
  ready_for_pickup: "Retirado",
  picked_up: "",
  ready_to_serve: "Servido",
  served: "",
  cancelled: "",
};

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
};

export function OrderCard({ order, onClick, onQuickStatusChange, nextStatus, compact = false }: OrderCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const status = statusConfig[order.status as OrderStatus] || statusConfig.pending;
  const orderType = (order.order_type || "delivery") as OrderType;
  const typeInfo = orderTypeLabels[orderType];
  const timeAgo = formatDistanceToNow(toSaoPauloTime(order.created_at), {
    addSuffix: true,
    locale: ptBR,
  });
  const scheduledFor = (order as any).scheduled_for ? toSaoPauloTime((order as any).scheduled_for) : null;

  const getOrderTypeIcon = () => {
    switch (orderType) {
      case "pickup":
        return <Package className="h-3 w-3" />;
      case "dine_in":
        return <UtensilsCrossed className="h-3 w-3" />;
      default:
        return <Truck className="h-3 w-3" />;
    }
  };

  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextStatus && onQuickStatusChange) {
      onQuickStatusChange(order, nextStatus);
    }
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${compact ? 'text-sm' : ''}`}
      style={{ borderLeftColor: order.status === "pending" ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
      onClick={onClick}
    >
      <CardHeader className={compact ? "p-2 pb-1" : "pb-2"}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-bold ${compact ? 'text-base' : 'text-lg'}`}>#{order.order_number}</span>
            <Badge variant={status.variant} className={compact ? "text-[10px] px-1.5 py-0" : ""}>{status.label}</Badge>
            <Badge variant="outline" className={`flex items-center gap-0.5 ${compact ? "text-[10px] px-1 py-0" : "text-xs"}`}>
              {getOrderTypeIcon()} {typeInfo.label}
            </Badge>
            {scheduledFor && (
              <Badge variant="secondary" className={`flex items-center gap-0.5 ${compact ? "text-[10px] px-1 py-0" : "text-xs"}`}>
                <Calendar className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {format(scheduledFor, "dd/MM HH:mm")}
              </Badge>
            )}
          </div>
          <div className={`flex items-center gap-1 text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
            <Clock className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            {timeAgo}
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "p-2 pt-0 space-y-1" : "space-y-2"}>
        <div className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          <User className={compact ? "h-3 w-3" : "h-4 w-4"} text-muted-foreground />
          <span className="font-medium truncate">{order.customer?.name}</span>
        </div>

        {!compact && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{order.customer?.phone}</span>
          </div>
        )}

        {!compact && orderType === "delivery" && order.customer?.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5" />
            <span className="line-clamp-1">
              {order.customer.address === "Localização via WhatsApp" 
                ? "📍 Localização via WhatsApp" 
                : `${order.customer.address}, ${order.customer.address_number}`}
            </span>
          </div>
        )}

        <div className={`border-t space-y-0.5 ${compact ? 'pt-1' : 'pt-2'}`}>
          {order.items?.slice(0, compact ? 2 : 3).map((item) => (
            <p key={item.id} className={`text-muted-foreground ${compact ? 'text-[11px]' : 'text-sm'}`}>
              {item.quantity}x {item.product_name}
            </p>
          ))}
          {order.items && order.items.length > (compact ? 2 : 3) && (
            <p className={`text-muted-foreground ${compact ? 'text-[11px]' : 'text-sm'}`}>
              +{order.items.length - (compact ? 2 : 3)} item(s)
            </p>
          )}
        </div>

        {order.notes && !compact && (
          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
            <MessageSquare className="h-4 w-4 mt-0.5" />
            <span className="line-clamp-2">{order.notes}</span>
          </div>
        )}

        {order.notes && compact && (
          <div className="flex items-center gap-1 text-amber-600">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10px] truncate">{order.notes}</span>
          </div>
        )}

        <div className={`flex items-center justify-between border-t ${compact ? 'pt-1' : 'pt-2'}`}>
          <div className={`flex items-center gap-1 ${compact ? 'text-[11px]' : 'text-sm'}`}>
            <CreditCard className={compact ? "h-3 w-3" : "h-4 w-4"} text-muted-foreground />
            <span>{paymentLabels[order.payment_method] || order.payment_method}</span>
          </div>
          <span className={`font-bold text-primary ${compact ? 'text-sm' : ''}`}>{formatPrice(order.total)}</span>
        </div>

        {nextStatus && onQuickStatusChange && (
          <Button 
            size="sm" 
            className={`w-full ${compact ? 'h-7 text-xs' : 'mt-2'}`}
            onClick={handleQuickAction}
          >
            {nextStatusLabels[order.status as OrderStatus] || "Avançar"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
