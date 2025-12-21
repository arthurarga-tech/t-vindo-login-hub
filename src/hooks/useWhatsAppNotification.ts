import { useEstablishment } from "./useEstablishment";
import { Order, OrderStatus } from "./useOrders";

// Map from our status codes to template keys
const statusToTemplateKey: Partial<Record<OrderStatus, string>> = {
  confirmed: "confirmed",
  preparing: "preparing",
  ready_for_pickup: "ready_pickup",
  ready: "ready_delivery",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  picked_up: "picked_up",
  served: "served",
};

const defaultTemplates: Record<string, string> = {
  confirmed: "✅ Olá {nome_cliente}! Seu pedido #{numero_pedido} foi confirmado! Valor: R$ {total}. Obrigado pela preferência! - {nome_estabelecimento}",
  preparing: "👨‍🍳 Olá {nome_cliente}! Seu pedido #{numero_pedido} está sendo preparado! - {nome_estabelecimento}",
  ready_pickup: "📦 Olá {nome_cliente}! Seu pedido #{numero_pedido} está pronto para retirada! - {nome_estabelecimento}",
  ready_delivery: "🚚 Olá {nome_cliente}! Seu pedido #{numero_pedido} está pronto e aguardando o motoboy! - {nome_estabelecimento}",
  out_for_delivery: "🛵 Olá {nome_cliente}! Seu pedido #{numero_pedido} saiu para entrega! - {nome_estabelecimento}",
  delivered: "🎉 Olá {nome_cliente}! Seu pedido #{numero_pedido} foi entregue! Bom apetite! - {nome_estabelecimento}",
  picked_up: "🎉 Olá {nome_cliente}! Pedido #{numero_pedido} retirado com sucesso! Bom apetite! - {nome_estabelecimento}",
  served: "🍽️ Olá {nome_cliente}! Seu pedido #{numero_pedido} foi servido! Bom apetite! - {nome_estabelecimento}",
};

function formatPhone(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // If already has country code (55), return as is
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    return cleaned;
  }
  
  // Add Brazil country code
  return `55${cleaned}`;
}

function formatMessage(template: string, order: Order, establishmentName: string): string {
  const total = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(order.total);

  return template
    .replace(/{nome_cliente}/g, order.customer?.name || "Cliente")
    .replace(/{numero_pedido}/g, String(order.order_number))
    .replace(/{total}/g, total)
    .replace(/{nome_estabelecimento}/g, establishmentName);
}

export function useWhatsAppNotification() {
  const { data: establishment } = useEstablishment();

  const isEnabled = (): boolean => {
    return (establishment as any)?.whatsapp_notifications_enabled === true;
  };

  const getTemplates = (): Record<string, string> => {
    const templates = (establishment as any)?.whatsapp_message_templates;
    if (templates && typeof templates === "object") {
      return { ...defaultTemplates, ...templates };
    }
    return defaultTemplates;
  };

  const generateWhatsAppLink = (order: Order, status: OrderStatus): string | null => {
    const templateKey = statusToTemplateKey[status];
    if (!templateKey) return null;

    const phone = order.customer?.phone;
    if (!phone) return null;

    const templates = getTemplates();
    const template = templates[templateKey] || defaultTemplates[templateKey];
    if (!template) return null;

    const message = formatMessage(template, order, establishment?.name || "");
    const formattedPhone = formatPhone(phone);
    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  };

  const openWhatsApp = (order: Order, status: OrderStatus): void => {
    const link = generateWhatsAppLink(order, status);
    if (link) {
      window.open(link, "_blank");
    }
  };

  const sendNotification = (order: Order, status: OrderStatus): void => {
    if (!isEnabled()) return;
    openWhatsApp(order, status);
  };

  return {
    isEnabled,
    getTemplates,
    generateWhatsAppLink,
    openWhatsApp,
    sendNotification,
    defaultTemplates,
  };
}
