import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Package, Truck, Home, ArrowLeft, Copy, Link2, XCircle, MessageCircle, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "bg-yellow-500" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "bg-blue-500" },
  preparing: { label: "Preparando", icon: Package, color: "bg-orange-500" },
  ready: { label: "Pronto", icon: Package, color: "bg-green-500" },
  ready_pickup: { label: "Pronto para Retirada", icon: Package, color: "bg-green-500" },
  ready_delivery: { label: "Pronto para Entrega", icon: Package, color: "bg-green-500" },
  out_for_delivery: { label: "Saiu para entrega", icon: Truck, color: "bg-purple-500" },
  delivered: { label: "Entregue", icon: Home, color: "bg-green-600" },
  picked_up: { label: "Retirado", icon: CheckCircle, color: "bg-green-600" },
  served: { label: "Servido", icon: CheckCircle, color: "bg-green-600" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "bg-red-500" },
};

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
      const { data } = await supabase
        .from('establishments')
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
          if (newStatus && statusConfig[newStatus]) {
            toast.success(`Status atualizado: ${statusConfig[newStatus].label}`);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const paymentMethodLabels: Record<string, string> = {
    pix: "Pix",
    credit: "Cartão de Crédito",
    debit: "Cartão de Débito",
    cash: "Dinheiro",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
          <Button onClick={() => navigate(`/loja/${slug}`)}>Voltar para a loja</Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 shadow-md">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/loja/${slug}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Pedido Confirmado</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Success Message */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-400">
              Pedido #{order.order_number || order.id.slice(0, 6).toUpperCase()} enviado!
            </h2>
            <p className="text-green-700 dark:text-green-500">
              O estabelecimento foi notificado e em breve entrará em contato.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Use o número <strong>#{order.order_number}</strong> para rastrear seu pedido
            </p>
          </CardContent>
        </Card>

        {/* Tracking Link */}
        <Card>
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
              >
                <Copy className="h-4 w-4" />
                Copiar Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 break-all">
              {trackingUrl}
            </p>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status do Pedido</span>
              <Badge className={`${status.color} text-white`}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {status.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pedido #{order.order_number || order.id.slice(0, 8).toUpperCase()}
            </p>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.product_name}
                  </span>
                  <span className="font-medium">{formatPrice(item.total)}</span>
                </div>
                {item.addons && item.addons.length > 0 && (
                  <div className="pl-4 space-y-0.5">
                    {item.addons.map((addon) => (
                      <div key={addon.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>+ {addon.quantity}x {addon.addon_name}</span>
                        <span>{formatPrice(addon.addon_price * addon.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span style={{ color: "hsl(var(--store-primary, var(--primary)))" }}>{formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{order.customer?.name}</span>
            </p>
            <p>{order.customer?.phone}</p>
            <p>
              {order.customer?.address}, {order.customer?.address_number}
              {order.customer?.address_complement && ` - ${order.customer.address_complement}`}
            </p>
            <p>
              {order.customer?.neighborhood}
              {order.customer?.city && `, ${order.customer.city}`}
            </p>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{paymentMethodLabels[order.payment_method]}</p>
            {order.payment_method === "pix" && establishmentPixKey ? (
              <p className="text-sm text-muted-foreground">Pagamento antecipado via Pix</p>
            ) : (
              <p className="text-sm text-muted-foreground">Pagamento na entrega</p>
            )}
            {order.payment_method === "cash" && order.change_for && order.change_for > 0 && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-sm">
                  Troco para: <span className="font-medium">{formatPrice(order.change_for)}</span>
                </p>
                <p className="text-sm text-primary font-medium">
                  Troco: {formatPrice(order.change_for - order.total)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PIX Receipt Button */}
        {showPixReceiptButton && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-400">Pagamento via Pix</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-500">
                Por favor, envie o comprovante de pagamento pelo WhatsApp.
              </p>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={sendPixReceipt}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar Comprovante via WhatsApp
              </Button>
            </CardContent>
          </Card>
        )}

        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.notes}</p>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/loja/${slug}`)}
        >
          Fazer novo pedido
        </Button>
      </main>
    </div>
  );
}