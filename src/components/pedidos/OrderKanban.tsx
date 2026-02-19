import { Order, useUpdateOrderStatus } from "@/hooks/useOrders";
import { OrderStatus, OrderType, getStatusFlow } from "@/lib/orderStatus";
import { OrderCard } from "./OrderCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface OrderKanbanProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onPrint?: (order: Order) => void;
  onQuickConfirmPrint?: (preOpenedWindow: Window | null, order: Order) => void;
  hideValues?: boolean;
  silentPrintOnConfirm?: boolean;
}

interface KanbanColumn {
  id: string;
  statuses: OrderStatus[];
  label: string;
  color: string;
}

// Columns that group related statuses from different order types
const columns: KanbanColumn[] = [
  { id: "pending", statuses: ["pending"], label: "Pendentes", color: "bg-red-500" },
  { id: "confirmed", statuses: ["confirmed"], label: "Confirmados", color: "bg-blue-500" },
  { id: "preparing", statuses: ["preparing"], label: "Preparando", color: "bg-orange-500" },
  { id: "ready", statuses: ["ready", "ready_for_pickup", "ready_to_serve"], label: "Prontos", color: "bg-yellow-500" },
  { id: "out_for_delivery", statuses: ["out_for_delivery"], label: "Em Entrega", color: "bg-purple-500" },
  { id: "completed", statuses: ["delivered", "picked_up", "served"], label: "Finalizados", color: "bg-green-500" },
];

export function OrderKanban({ orders, onOrderClick, onPrint, onQuickConfirmPrint, hideValues = false, silentPrintOnConfirm = false }: OrderKanbanProps) {
  const updateStatus = useUpdateOrderStatus();

  const getOrdersByStatuses = (statuses: OrderStatus[]) => {
    return orders.filter((order) => statuses.includes(order.status as OrderStatus));
  };

  const handleQuickStatusChange = async (order: Order, newStatus: OrderStatus) => {
    // Pre-open print window IMMEDIATELY on user gesture before any await
    // Skip for RawBT silent print — no window needed
    let printWin: Window | null = null;
    if (newStatus === "confirmed" && onQuickConfirmPrint && !silentPrintOnConfirm) {
      printWin = window.open("", "_blank");
    }

    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: newStatus });
      toast.success(`Pedido #${order.order_number} atualizado`);
      
      if (newStatus === "confirmed" && onQuickConfirmPrint) {
        onQuickConfirmPrint(printWin, order);
      }
    } catch (error) {
      try { printWin?.close(); } catch { /* ignore */ }
      toast.error("Erro ao atualizar status");
    }
  };

  const getNextStatus = (order: Order): OrderStatus | null => {
    const flow = getStatusFlow(order.order_type as OrderType);
    const currentIndex = flow.indexOf(order.status as OrderStatus);
    if (currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    return null;
  };

  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2"
      data-testid="order-kanban"
      role="region"
      aria-label="Quadro Kanban de pedidos"
    >
      {columns.map((column) => {
        const columnOrders = getOrdersByStatuses(column.statuses);
        
        return (
          <div 
            key={column.id}
            className="bg-muted/30 rounded-lg min-h-[200px]"
            data-testid={`kanban-column-${column.id}`}
            role="region"
            aria-label={`Coluna ${column.label}`}
          >
            <div className="p-1.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div 
                  className={`w-2 h-2 rounded-full ${column.color}`} 
                  aria-hidden="true" 
                  data-testid={`kanban-column-indicator-${column.id}`}
                />
                <h3 
                  className="font-semibold text-xs"
                  data-testid={`kanban-column-title-${column.id}`}
                >
                  {column.label}
                </h3>
              </div>
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1 py-0"
                data-testid={`kanban-column-count-${column.id}`}
                aria-label={`${columnOrders.length} pedidos`}
              >
                {columnOrders.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-1.5 space-y-1.5" role="list" aria-label={`Pedidos ${column.label}`}>
                {columnOrders.length === 0 ? (
                  <p 
                    className="text-center text-muted-foreground text-[10px] py-4"
                    data-testid={`kanban-column-empty-${column.id}`}
                    role="status"
                  >
                    Vazio
                  </p>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      onClick={() => onOrderClick(order)}
                      onQuickStatusChange={handleQuickStatusChange}
                      onPrint={onPrint}
                      nextStatus={getNextStatus(order)}
                      hideValues={hideValues}
                      compact
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
