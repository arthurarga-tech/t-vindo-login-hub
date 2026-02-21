import { Clock, User, UtensilsCrossed, ShoppingBag, Receipt, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Order } from "@/hooks/useOrders";
import { statusDisplayConfig, type OrderStatus } from "@/lib/orderStatus";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toSaoPauloTime } from "@/lib/dateUtils";
import { formatPrice } from "@/lib/formatters";

interface TableCardProps {
  order: Order;
  onClick: () => void;
  onCloseTab: () => void;
  onAddItem?: () => void;
}

export function TableCard({ order, onClick, onCloseTab, onAddItem }: TableCardProps) {
  const status = statusDisplayConfig[order.status as OrderStatus] || statusDisplayConfig.pending;
  const tableNumber = (order as any).table_number;
  const timeAgo = formatDistanceToNow(toSaoPauloTime(order.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-t-4"
      style={{ borderTopColor: "hsl(var(--primary))" }}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">
              Mesa {tableNumber || "—"}
            </span>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{order.customer_display_name || order.customer?.name}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{timeAgo}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingBag className="h-4 w-4" />
          <span>{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-medium text-muted-foreground">
            Pedido #{order.order_number}
          </span>
          <span className="font-bold text-primary text-lg">
            {formatPrice(order.total)}
          </span>
        </div>

        <div className="flex gap-2">
          {onAddItem && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onAddItem();
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab();
            }}
          >
            <Receipt className="h-4 w-4" />
            Fechar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
