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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {columns.map((column) => {
        const columnOrders = getOrdersByStatus(column.status);
        
        return (
          <div 
            key={column.status}
            className="bg-muted/30 rounded-lg min-h-[200px]"
          >
            <div className="p-1.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${column.color}`} />
                <h3 className="font-semibold text-xs">{column.label}</h3>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1 py-0">{columnOrders.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-1.5 space-y-1.5">
                {columnOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground text-[10px] py-4">
                    Vazio
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
