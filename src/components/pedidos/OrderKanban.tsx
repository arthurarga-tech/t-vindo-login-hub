import { Order, OrderStatus } from "@/hooks/useOrders";
import { OrderCard } from "./OrderCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter((order) => order.status === status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnOrders = getOrdersByStatus(column.status);
        
        return (
          <div 
            key={column.status}
            className="flex-shrink-0 w-80 bg-muted/30 rounded-lg"
          >
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold">{column.label}</h3>
              </div>
              <Badge variant="secondary">{columnOrders.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-3 space-y-3">
                {columnOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum pedido
                  </p>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      onClick={() => onOrderClick(order)}
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
