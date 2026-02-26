import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ArrowLeft, Copy, Link2, MessageCircle, QrCode } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { usePublicEstablishment } from "@/hooks/usePublicStore";
import { buildThemeStyles, formatPrice } from "@/lib/formatters";
import { useThemeColor } from "@/hooks/useThemeColor";
import { 
  getStatusDisplay, 
  paymentMethodLabels 
} from "@/lib/orderStatus";

interface OrderItemAddon {
  id: string;
  addon_name: string;
  addon_price: number;
  quantity: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  total: number;
  product_price: number;
  addons?: OrderItemAddon[] | null;
}

interface Customer {
  name: string;
  phone: string;
  address: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
}

interface PublicOrder {
  id: string;
  order_number: number;
  status: string;
  order_type: string;
  created_at: string;
  total: number;
  delivery_fee: number;
  subtotal: number;
  payment_method: string;
  change_for: number | null;
  notes: string | null;
  establishment_id: string;
  customer: Customer;
  items: OrderItem[];
}

export default function OrderConfirmationPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sharedLocationViaWhatsApp, setSharedLocationViaWhatsApp] = useState(false);

  // Fetch establishment data for theme colors
  const { data: establishment } = usePublicEstablishment(slug || "");

  // Dynamically update browser theme-color based on establishment's primary color
  useThemeColor(establishment?.theme_primary_color);

  // Custom styles based on establishment theme colors (centralized utility)
  const customStyles = useMemo(() => {
    return buildThemeStyles(
      establishment?.theme_primary_color,
      establishment?.theme_secondary_color,
    );
  }, [establishment?.theme_primary_color, establishment?.theme_secondary_color]);

  // Use secure RPC function instead of direct query
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_public_order_by_id', {
          p_order_id: orderId
        });

      if (error) throw error;
      return data as unknown as PublicOrder | null;
    },
    enabled: !!orderId,
  });

  // Save order to localStorage for quick tracking and check if location was shared
  useEffect(() => {
    if (order && slug) {
      // Check if this order had location shared via WhatsApp
      const savedOrder = localStorage.getItem(`lastOrder_${slug}`);
      if (savedOrder) {
        try {
          const parsed = JSON.parse(savedOrder);
          if (parsed.orderId === order.id) {
            setSharedLocationViaWhatsApp(parsed.sharedLocationViaWhatsApp || false);
          }
        } catch {
          // Ignore parse errors
        }
      }

      localStorage.setItem(`lastOrder_${slug}`, JSON.stringify({
        orderId: order.id,
        orderNumber: order.order_number,
        timestamp: Date.now(),
        sharedLocationViaWhatsApp: sharedLocationViaWhatsApp,
      }));
    }
  }, [order, slug, sharedLocationViaWhatsApp]);

  // Fetch establishment phone for PIX receipt WhatsApp message
  const { data: establishmentData } = useQuery({
    queryKey: ["establishment-phone", order?.establishment_id],
    queryFn: async () => {
      if (!order?.establishment_id) return null;
      // Use establishments_public view for security
      const { data } = await supabase
        .from('establishments_public')
        .select('phone, pix_key')
        .eq('id', order.establishment_id)
        .single();
      return data;
    },
    enabled: !!order?.establishment_id && order?.payment_method === "pix",
  });

  const establishmentPhone = establishmentData?.phone || "";
  const establishmentPixKey = establishmentData?.pix_key || "";

  // Show PIX receipt button only if:
  // 1. Payment method is PIX
  // 2. PIX key is configured
  // 3. Location was NOT shared via WhatsApp (to avoid duplicate messages)
  const showPixReceiptButton = order?.payment_method === "pix" && 
    establishmentPixKey && 
    !sharedLocationViaWhatsApp && 
    establishmentPhone;

  const sendPixReceipt = () => {
    if (!establishmentPhone || !order) return;
    
    const storePhone = establishmentPhone.replace(/\D/g, "");
    const formattedPhone = storePhone.startsWith("55") ? storePhone : `55${storePhone}`;
    
    const message = `Olá! Estou enviando o comprovante do pagamento Pix.\n\nPedido #${order.order_number}\nCliente: ${order.customer?.name}\nValor: ${formatPrice(order.total)}`;
    const encodedMessage = encodeURIComponent(message);
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, "_blank");
  };

  // Real-time subscription for order status updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          // Refetch order data when status changes
          queryClient.invalidateQueries({ queryKey: ["order", orderId] });
          
          // Show toast notification for status change
          const newStatus = payload.new?.status;
          if (newStatus) {
            const statusInfo = getStatusDisplay(newStatus);
            toast.success(`Status atualizado: ${statusInfo.label}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  const trackingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/loja/${slug}/pedido/${orderId}`
    : '';

  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };


  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-background p-4"
        data-testid="order-confirmation-loading"
        aria-busy="true"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div 
        className="min-h-screen bg-background flex items-center justify-center"
        data-testid="order-confirmation-not-found"
        role="alert"
      >
        <div className="text-center space-y-4">
          <h1 
            className="text-2xl font-bold"
            data-testid="order-confirmation-not-found-title"
          >
            Pedido não encontrado
          </h1>
          <Button 
            onClick={() => navigate(`/loja/${slug}`)}
            data-testid="order-confirmation-not-found-back-button"
          >
            Voltar para a loja
          </Button>
        </div>
      </div>
    );
  }

  const status = getStatusDisplay(order.status);
  const StatusIcon = status.icon;

  return (
    <div 
      className="min-h-screen bg-background"
      style={customStyles}
      data-testid="order-confirmation-page"
    >
      <header 
        className="py-4 shadow-md text-primary-foreground"
        style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
        data-testid="order-confirmation-header"
      >
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/loja/${slug}`)}
              data-testid="order-confirmation-back-button"
              aria-label="Voltar para a loja"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 
              className="text-xl font-bold"
              data-testid="order-confirmation-title"
            >
              Pedido Confirmado
            </h1>
          </div>
        </div>
      </header>

      <main 
        className="max-w-2xl mx-auto px-4 py-6 space-y-6"
        data-testid="order-confirmation-main"
        role="main"
      >
        {/* Success Message */}
        <Card 
          className="border-green-200 bg-green-50 dark:bg-green-950/20"
          data-testid="order-confirmation-success-card"
        >
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 
              className="text-2xl font-bold text-green-800 dark:text-green-400"
              data-testid="order-confirmation-success-title"
            >
              Pedido #{order.order_number || order.id.slice(0, 6).toUpperCase()} enviado!
            </h2>
            <p 
              className="text-green-700 dark:text-green-500"
              data-testid="order-confirmation-success-message"
            >
              O estabelecimento foi notificado e em breve entrará em contato.
            </p>
            <p 
              className="text-sm text-muted-foreground mt-2"
              data-testid="order-confirmation-track-hint"
            >
              Use o número <strong>#{order.order_number}</strong> para rastrear seu pedido
            </p>
          </CardContent>
        </Card>

        {/* Tracking Link */}
        <Card data-testid="order-confirmation-tracking-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link2 className="h-4 w-4" />
                <span>Link para acompanhar:</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyTrackingLink}
                className="gap-2"
                data-testid="order-confirmation-copy-link-button"
                aria-label="Copiar link de acompanhamento"
              >
                <Copy className="h-4 w-4" />
                Copiar Link
              </Button>
            </div>
            <p 
              className="text-xs text-muted-foreground mt-2 break-all"
              data-testid="order-confirmation-tracking-url"
            >
              {trackingUrl}
            </p>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card data-testid="order-confirmation-status-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status do Pedido</span>
              <Badge 
                className={`${status.color} text-white`}
                data-testid="order-confirmation-status-badge"
                aria-label={`Status: ${status.label}`}
              >
                <StatusIcon className="h-4 w-4 mr-1" />
                {status.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p 
              className="text-sm text-muted-foreground"
              data-testid="order-confirmation-order-number"
            >
              Pedido #{order.order_number || order.id.slice(0, 8).toUpperCase()}
            </p>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card data-testid="order-confirmation-items-card">
          <CardHeader>
            <CardTitle className="text-lg">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items?.map((item) => (
              <div 
                key={item.id} 
                className="space-y-1"
                data-testid={`order-confirmation-item-${item.id}`}
              >
                <div className="flex justify-between text-sm">
                  <span data-testid="order-confirmation-item-name">
                    {item.quantity}x {item.product_name}
                  </span>
                  <span 
                    className="font-medium"
                    data-testid="order-confirmation-item-total"
                  >
                    {formatPrice(item.total)}
                  </span>
                </div>
                {item.addons && item.addons.length > 0 && (
                  <div className="pl-4 space-y-0.5">
                    {item.addons.map((addon) => (
                      <div 
                        key={addon.id} 
                        className="flex justify-between text-xs text-muted-foreground"
                        data-testid={`order-confirmation-addon-${addon.id}`}
                      >
                        <span>+ {addon.quantity}x {addon.addon_name}</span>
                        <span>{formatPrice(addon.addon_price * addon.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Separator />
            <div 
              className="flex justify-between font-semibold"
              data-testid="order-confirmation-total"
            >
              <span>Total</span>
              <span style={{ color: "hsl(var(--store-primary, var(--primary)))" }}>{formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card data-testid="order-confirmation-delivery-card">
          <CardHeader>
            <CardTitle className="text-lg">
              {order.order_type === "pickup" ? "Retirada" : order.order_type === "dine_in" ? "Consumo Local" : "Entrega"}
            </CardTitle>
          </CardHeader>
          <CardContent 
            className="space-y-2 text-sm"
            data-testid="order-confirmation-delivery-content"
          >
            <p>
              <span 
                className="font-medium"
                data-testid="order-confirmation-customer-name"
              >
                {order.customer?.name}
              </span>
            </p>
            <p data-testid="order-confirmation-customer-phone">{order.customer?.phone}</p>
            <p data-testid="order-confirmation-address-street">
              {order.customer?.address}, {order.customer?.address_number}
              {order.customer?.address_complement && ` - ${order.customer.address_complement}`}
            </p>
            <p data-testid="order-confirmation-address-neighborhood">
              {order.customer?.neighborhood}
              {order.customer?.city && `, ${order.customer.city}`}
            </p>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card data-testid="order-confirmation-payment-card">
          <CardHeader>
            <CardTitle className="text-lg">Pagamento</CardTitle>
          </CardHeader>
          <CardContent 
            className="space-y-2"
            data-testid="order-confirmation-payment-content"
          >
            <p 
              className="font-medium"
              data-testid="order-confirmation-payment-method"
            >
              {paymentMethodLabels[order.payment_method] || order.payment_method}
            </p>
            {order.payment_method === "pix" && establishmentPixKey ? (
              <p className="text-sm text-muted-foreground">Pagamento antecipado via Pix</p>
            ) : (
              <p className="text-sm text-muted-foreground">Pagamento na entrega</p>
            )}
            {order.payment_method === "cash" && order.change_for && order.change_for > 0 && (
              <div className="mt-2 pt-2 border-t space-y-1">
                <p className="text-sm text-muted-foreground">
                  Troco para: <span className="font-medium text-foreground">{formatPrice(order.change_for)}</span>
                </p>
                <p className="text-sm text-primary font-medium">
                  Levar troco: {formatPrice(order.change_for - order.total)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PIX Receipt Button */}
        {showPixReceiptButton && (
          <Card data-testid="order-confirmation-pix-receipt-card">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <QrCode className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Já fez o pagamento Pix? Envie o comprovante:
                </p>
                <Button 
                  onClick={sendPixReceipt}
                  className="gap-2"
                  style={{ backgroundColor: "hsl(142, 70%, 45%)" }}
                  data-testid="order-confirmation-pix-receipt-button"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar Comprovante via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to Store */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/loja/${slug}`)}
          data-testid="order-confirmation-back-to-store-button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para a loja
        </Button>
      </main>
    </div>
  );
}
