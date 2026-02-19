import { Order, useUpdateOrderStatus } from "@/hooks/useOrders";
import { OrderStatus, OrderType, getStatusFlow } from "@/lib/orderStatus";
import { OrderCard } from "./OrderCard";
import { toast } from "sonner";

interface OrderListProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onPrint?: (order: Order) => void;
  onQuickConfirmPrint?: (preOpenedWindow: Window | null, order: Order) => void;
  hideValues?: boolean;
  silentPrintOnConfirm?: boolean;
}

export function OrderList({ orders, onOrderClick, onPrint, onQuickConfirmPrint, hideValues = false, silentPrintOnConfirm = false }: OrderListProps) {
  const updateStatus = useUpdateOrderStatus();

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

  if (orders.length === 0) {
    return (
      <div 
        className="text-center py-12"
        data-testid="order-list-empty"
        role="status"
        aria-label="Nenhum pedido encontrado"
      >
        <p className="text-muted-foreground">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div 
      className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      data-testid="order-list"
      role="list"
      aria-label="Lista de pedidos"
    >
      {orders.map((order) => (
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
      ))}
    </div>
  );
}
