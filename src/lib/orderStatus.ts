import { Clock, CheckCircle, Package, Truck, Home, XCircle, UtensilsCrossed, type LucideIcon } from "lucide-react";

// Types
export type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "preparing" 
  | "ready" 
  | "out_for_delivery" 
  | "delivered" 
  | "ready_for_pickup" 
  | "picked_up" 
  | "ready_to_serve" 
  | "served" 
  | "cancelled";

export type OrderType = "delivery" | "pickup" | "dine_in";

// Status display configuration
export interface StatusDisplayConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: LucideIcon;
  color: string;
}

export const statusDisplayConfig: Record<OrderStatus, StatusDisplayConfig> = {
  pending: { label: "Pendente", variant: "destructive", icon: Clock, color: "bg-yellow-500" },
  confirmed: { label: "Confirmado", variant: "default", icon: CheckCircle, color: "bg-blue-500" },
  preparing: { label: "Preparando", variant: "secondary", icon: Package, color: "bg-orange-500" },
  ready: { label: "Pronto", variant: "default", icon: Package, color: "bg-green-500" },
  ready_for_pickup: { label: "Pronto para Retirada", variant: "default", icon: Package, color: "bg-green-500" },
  ready_to_serve: { label: "Pronto para Servir", variant: "default", icon: UtensilsCrossed, color: "bg-green-500" },
  out_for_delivery: { label: "Saiu para Entrega", variant: "secondary", icon: Truck, color: "bg-purple-500" },
  delivered: { label: "Entregue", variant: "outline", icon: Home, color: "bg-green-600" },
  picked_up: { label: "Retirado", variant: "outline", icon: CheckCircle, color: "bg-green-600" },
  served: { label: "Servido", variant: "outline", icon: CheckCircle, color: "bg-green-600" },
  cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle, color: "bg-red-500" },
};

// Status flows by order type
export const statusFlowByOrderType: Record<OrderType, OrderStatus[]> = {
  delivery: ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
  pickup: ["pending", "confirmed", "preparing", "ready_for_pickup", "picked_up"],
  dine_in: ["pending", "confirmed", "preparing", "ready_to_serve", "served"],
};

export function getStatusFlow(orderType: OrderType): OrderStatus[] {
  return statusFlowByOrderType[orderType] || statusFlowByOrderType.delivery;
}

// WhatsApp template key mapping
export const statusToWhatsAppTemplateKey: Partial<Record<OrderStatus, string>> = {
  confirmed: "confirmed",
  preparing: "preparing",
  ready_for_pickup: "ready_pickup",
  ready: "ready_delivery",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  picked_up: "picked_up",
  served: "served",
};

// Order type labels
export const orderTypeLabels: Record<OrderType, { label: string; icon: string }> = {
  delivery: { label: "Entrega", icon: "🚚" },
  pickup: { label: "Retirada", icon: "📦" },
  dine_in: { label: "No Local", icon: "🍽️" },
};

// Payment method labels
export const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  cash: "Dinheiro",
  card: "Cartão",
};

// Next status button labels (full labels for modals)
export const nextStatusButtonLabels: Record<OrderStatus, string> = {
  pending: "",
  confirmed: "Confirmar Pedido",
  preparing: "Iniciar Preparo",
  ready: "Marcar como Pronto",
  ready_for_pickup: "Pronto p/ Retirada",
  ready_to_serve: "Pronto p/ Servir",
  out_for_delivery: "Saiu para Entrega",
  delivered: "Marcar como Entregue",
  picked_up: "Marcar como Retirado",
  served: "Marcar como Servido",
  cancelled: "Cancelar",
};

// Previous status button labels (for modals)
export const previousStatusButtonLabels: Record<OrderStatus, string> = {
  pending: "Voltar para Pendente",
  confirmed: "Voltar para Confirmado",
  preparing: "Voltar para Preparando",
  ready: "Voltar para Pronto",
  out_for_delivery: "Voltar para Saiu p/ Entrega",
  delivered: "",
  ready_for_pickup: "Voltar para Pronto p/ Retirada",
  picked_up: "",
  ready_to_serve: "Voltar para Pronto p/ Servir",
  served: "",
  cancelled: "",
};

// Quick action labels (compact for cards)
export const quickActionLabels: Record<OrderStatus, string> = {
  pending: "Confirmar",
  confirmed: "Preparar",
  preparing: "Pronto",
  ready: "Saiu Entrega",
  ready_for_pickup: "Retirado",
  ready_to_serve: "Servido",
  out_for_delivery: "Entregue",
  delivered: "",
  picked_up: "",
  served: "",
  cancelled: "",
};

// Order type labels for public pages (without emoji)
export const orderTypePublicLabels: Record<string, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
  dine_in: "Consumo local",
};

// Finalized statuses (for tracking page)
export const finalizedStatuses: OrderStatus[] = ["delivered", "picked_up", "served", "cancelled"];

// Helper to get status display or fallback to pending
export function getStatusDisplay(status: string): StatusDisplayConfig {
  return statusDisplayConfig[status as OrderStatus] || statusDisplayConfig.pending;
}

// Helper to check if status is finalized
export function isStatusFinalized(status: string): boolean {
  return finalizedStatuses.includes(status as OrderStatus);
}
