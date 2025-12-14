import { Order } from "@/hooks/useOrders";
import { OrderCard } from "./OrderCard";

interface OrderListProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

export function OrderList({ orders, onOrderClick }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <OrderCard 
          key={order.id} 
          order={order} 
          onClick={() => onOrderClick(order)}
        />
      ))}
    </div>
  );
}
