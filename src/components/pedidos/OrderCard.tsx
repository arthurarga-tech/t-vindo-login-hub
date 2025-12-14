import { Clock, User, MapPin, Phone, CreditCard, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order, OrderStatus } from "@/hooks/useOrders";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderCardProps {
  order: Order;
  onClick: () => void;
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

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
};

export function OrderCard({ order, onClick }: OrderCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const status = statusConfig[order.status as OrderStatus] || statusConfig.pending;
  const timeAgo = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: order.status === "pending" ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">#{order.order_number}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{order.customer?.name}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{order.customer?.phone}</span>
        </div>

        {order.customer?.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5" />
            <span className="line-clamp-1">
              {order.customer.address === "Localização via WhatsApp" 
                ? "📍 Localização via WhatsApp" 
                : `${order.customer.address}, ${order.customer.address_number}`}
            </span>
          </div>
        )}

        <div className="pt-2 border-t space-y-1">
          {order.items?.slice(0, 3).map((item) => (
            <p key={item.id} className="text-sm text-muted-foreground">
              {item.quantity}x {item.product_name}
            </p>
          ))}
          {order.items && order.items.length > 3 && (
            <p className="text-sm text-muted-foreground">
              +{order.items.length - 3} item(s)
            </p>
          )}
        </div>

        {order.notes && (
          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
            <MessageSquare className="h-4 w-4 mt-0.5" />
            <span className="line-clamp-2">{order.notes}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>{paymentLabels[order.payment_method] || order.payment_method}</span>
          </div>
          <span className="font-bold text-primary">{formatPrice(order.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
