import { Clock, User, UtensilsCrossed, ShoppingBag, Receipt, Plus, Package } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRecord, getTableTotal, getTableItemStatusCounts } from "@/hooks/useTables";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toSaoPauloTime } from "@/lib/dateUtils";
import { formatPrice } from "@/lib/formatters";

interface TableCardProps {
  table: TableRecord;
  onClick: () => void;
  onCloseTable: () => void;
  onAddOrder?: () => void;
}

export function TableCard({ table, onClick, onCloseTable, onAddOrder }: TableCardProps) {
  const timeAgo = formatDistanceToNow(toSaoPauloTime(table.opened_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const total = getTableTotal(table);
  const orderCount = table.orders.filter(o => o.status !== "cancelled").length;
  const statusCounts = getTableItemStatusCounts(table);
  const totalItems = statusCounts.pending + statusCounts.preparing + statusCounts.ready + statusCounts.delivered;

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
              Mesa {table.table_number}
            </span>
          </div>
          <Badge variant="default">{orderCount} {orderCount === 1 ? "pedido" : "pedidos"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{table.customer_display_name || table.customer?.name || "—"}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{timeAgo}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingBag className="h-4 w-4" />
          <span>{totalItems} {totalItems === 1 ? "item" : "itens"}</span>
        </div>

        {/* Item status badges */}
        <div className="flex flex-wrap gap-1">
          {statusCounts.preparing > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Package className="h-3 w-3 mr-1" />
              {statusCounts.preparing} preparando
            </Badge>
          )}
          {statusCounts.ready > 0 && (
            <Badge variant="default" className="text-xs">
              {statusCounts.ready} {statusCounts.ready === 1 ? "pronto" : "prontos"}
            </Badge>
          )}
          {statusCounts.pending > 0 && (
            <Badge variant="destructive" className="text-xs">
              {statusCounts.pending} {statusCounts.pending === 1 ? "pendente" : "pendentes"}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-medium text-muted-foreground">
            Total acumulado
          </span>
          <span className="font-bold text-primary text-lg">
            {formatPrice(total)}
          </span>
        </div>

        <div className="flex gap-2">
          {onAddOrder && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onAddOrder();
              }}
            >
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onCloseTable();
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
