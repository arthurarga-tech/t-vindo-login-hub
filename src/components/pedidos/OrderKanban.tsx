import { Order, OrderStatus, OrderType, getStatusFlow, useUpdateOrderStatus } from "@/hooks/useOrders";
import { OrderCard } from "./OrderCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface OrderKanbanProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

interface KanbanColumn {
  status: OrderStatus;
  label: string;
  color: string;
}

const columns: KanbanColumn[] = [
  { status: "pending", label: "Pendentes", color: "bg-red-500" },
  { status: "confirmed", label: "Confirmados", color: "bg-blue-500" },
  { status: "preparing", label: "Preparando", color: "bg-orange-500" },
  { status: "ready", label: "Prontos", color: "bg-yellow-500" },
  { status: "out_for_delivery", label: "Em Entrega", color: "bg-purple-500" },
  { status: "delivered", label: "Entregues", color: "bg-green-500" },
];

export function OrderKanban({ orders, onOrderClick }: OrderKanbanProps) {
  const updateStatus = useUpdateOrderStatus();

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter((order) => order.status === status);
  };

  const handleQuickStatusChange = async (order: Order, newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: newStatus });
      toast.success(`Pedido #${order.order_number} atualizado`);
    } catch (error) {
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
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnOrders = getOrdersByStatus(column.status);
        
        return (
          <div 
            key={column.status}
            className="flex-shrink-0 w-72 bg-muted/30 rounded-lg"
          >
            <div className="p-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                <h3 className="font-semibold text-sm">{column.label}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">{columnOrders.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="p-2 space-y-2">
                {columnOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-6">
                    Nenhum pedido
                  </p>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      onClick={() => onOrderClick(order)}
                      onQuickStatusChange={handleQuickStatusChange}
                      nextStatus={getNextStatus(order)}
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
