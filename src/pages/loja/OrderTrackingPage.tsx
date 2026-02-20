import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, ArrowLeft, Search, XCircle, MapPin, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { usePublicEstablishment } from "@/hooks/usePublicStore";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";
import { buildThemeStyles } from "@/lib/formatters";
import { useThemeColor } from "@/hooks/useThemeColor";
import { 
  getStatusDisplay, 
  paymentMethodLabels, 
  orderTypePublicLabels, 
  finalizedStatuses,
  statusDisplayConfig,
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
  payment_method: string;
  change_for: number | null;
  notes: string | null;
  customer: Customer;
  items: OrderItem[];
}

export default function OrderTrackingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState("");
  const [searchedNumber, setSearchedNumber] = useState<number | null>(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

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

  // Auto-load last order from localStorage on mount
  useEffect(() => {
    if (hasAutoLoaded || !slug) return;
    
    const storedOrder = localStorage.getItem(`lastOrder_${slug}`);
    if (storedOrder) {
      try {
        const { orderNumber: lastOrderNumber, timestamp } = JSON.parse(storedOrder);
        // Only auto-load if order is less than 24 hours old
        const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
        if (lastOrderNumber && isRecent) {
          setOrderNumber(String(lastOrderNumber));
          setSearchedNumber(lastOrderNumber);
        }
      } catch (e) {
        console.error("Error parsing stored order", e);
      }
    }
    setHasAutoLoaded(true);
  }, [slug, hasAutoLoaded]);

  // Use secure RPC function instead of direct query
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order-by-number", establishment?.id, searchedNumber],
    queryFn: async () => {
      if (!establishment?.id || !searchedNumber) return null;

      const { data, error } = await supabase
        .rpc('get_public_order_by_number', {
          p_establishment_id: establishment.id,
          p_order_number: searchedNumber
        });

      if (error) throw error;
      return data as unknown as PublicOrder | null;
    },
    enabled: !!establishment?.id && !!searchedNumber,
    retry: false,
  });

  // Real-time subscription for order status updates
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["order-by-number", establishment?.id, searchedNumber] });
          
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
  }, [order?.id, queryClient, establishment?.id, searchedNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(orderNumber, 10);
    if (!isNaN(num) && num > 0) {
      setSearchedNumber(num);
    } else {
      toast.error("Digite um número de pedido válido");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const status = order ? getStatusDisplay(order.status) : null;
  const StatusIcon = status?.icon;
  const isFinalized = order ? finalizedStatuses.includes(order.status as any) : false;

  return (
    <div 
      className="min-h-screen bg-background"
      style={customStyles}
      data-testid="order-tracking-page"
    >
      <header 
        className="py-4 shadow-md text-primary-foreground"
        style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
        data-testid="order-tracking-header"
      >
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/loja/${slug}`)}
              data-testid="order-tracking-back-button"
              aria-label="Voltar para a loja"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 
                className="text-xl font-bold"
                data-testid="order-tracking-title"
              >
                Acompanhar Pedido
              </h1>
              {establishment?.name && (
                <p 
                  className="text-sm text-primary-foreground/80"
                  data-testid="order-tracking-store-name"
                >
                  {establishment.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main 
        className="max-w-2xl mx-auto px-4 py-6 space-y-6"
        data-testid="order-tracking-main"
        role="main"
      >
        {/* Search Form */}
        <Card data-testid="order-tracking-search-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Pedido
            </CardTitle>
            <CardDescription data-testid="order-tracking-search-description">
              {order && !isFinalized 
                ? "Seu último pedido está sendo exibido abaixo"
                : "Digite o número do seu pedido para acompanhar em tempo real"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form 
              onSubmit={handleSearch} 
              className="flex gap-2"
              data-testid="order-tracking-search-form"
            >
              <Input
                type="number"
                placeholder="Ex: 123"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="flex-1"
                min="1"
                data-testid="order-tracking-search-input"
                aria-label="Número do pedido"
              />
              <Button 
                type="submit" 
                disabled={!orderNumber}
                style={{ backgroundColor: "hsl(var(--store-primary, var(--primary)))" }}
                data-testid="order-tracking-search-button"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && searchedNumber && (
          <div 
            className="space-y-4"
            data-testid="order-tracking-loading"
            aria-busy="true"
          >
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* Not Found State */}
        {(isError || (searchedNumber && !isLoading && !order)) && (
          <Card 
            className="border-destructive/50 bg-destructive/10"
            data-testid="order-tracking-not-found"
            role="alert"
          >
            <CardContent className="pt-6 text-center space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 
                className="text-xl font-bold"
                data-testid="order-tracking-not-found-title"
              >
                Pedido não encontrado
              </h2>
              <p 
                className="text-muted-foreground"
                data-testid="order-tracking-not-found-message"
              >
                Não encontramos nenhum pedido com o número #{searchedNumber}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {order && status && StatusIcon && (
          <>
            {/* Status Card */}
            <Card data-testid="order-tracking-status-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span data-testid="order-tracking-order-number">Pedido #{order.order_number}</span>
                  <Badge 
                    className={`${status.color} text-white`}
                    data-testid="order-tracking-status-badge"
                    aria-label={`Status: ${status.label}`}
                  >
                    <StatusIcon className="h-4 w-4 mr-1" />
                    {status.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-testid="order-tracking-order-info"
                >
                  <Clock className="h-4 w-4" />
                  <span data-testid="order-tracking-order-date">
                    {formatInSaoPaulo(order.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                  <span className="mx-2">•</span>
                  <span data-testid="order-tracking-order-type">
                    {orderTypePublicLabels[order.order_type] || order.order_type}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card data-testid="order-tracking-items-card">
              <CardHeader>
                <CardTitle className="text-lg">Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items?.map((item) => (
                  <div 
                    key={item.id} 
                    className="space-y-1"
                    data-testid={`order-tracking-item-${item.id}`}
                  >
                    <div className="flex justify-between text-sm">
                      <span data-testid="order-tracking-item-name">
                        {item.quantity}x {item.product_name}
                      </span>
                      <span 
                        className="font-medium"
                        data-testid="order-tracking-item-total"
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
                            data-testid={`order-tracking-addon-${addon.id}`}
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
                {order.delivery_fee > 0 && (
                  <div 
                    className="flex justify-between text-sm"
                    data-testid="order-tracking-delivery-fee"
                  >
                    <span>Taxa de entrega</span>
                    <span>{formatPrice(order.delivery_fee)}</span>
                  </div>
                )}
                <div 
                  className="flex justify-between font-semibold text-lg"
                  data-testid="order-tracking-total"
                >
                  <span>Total</span>
                  <span style={{ color: "hsl(var(--store-primary, var(--primary)))" }}>{formatPrice(order.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery/Pickup Info */}
            {order.order_type === "delivery" && order.customer && (
              <Card data-testid="order-tracking-address-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent 
                  className="space-y-1 text-sm"
                  data-testid="order-tracking-address-content"
                >
                  <p className="font-medium" data-testid="order-tracking-customer-name">
                    {order.customer.name}
                  </p>
                  <p data-testid="order-tracking-address-street">
                    {order.customer.address}, {order.customer.address_number}
                    {order.customer.address_complement && ` - ${order.customer.address_complement}`}
                  </p>
                  <p data-testid="order-tracking-address-neighborhood">
                    {order.customer.neighborhood}
                    {order.customer.city && `, ${order.customer.city}`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card data-testid="order-tracking-payment-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent data-testid="order-tracking-payment-content">
                <p 
                  className="font-medium"
                  data-testid="order-tracking-payment-method"
                >
                  {paymentMethodLabels[order.payment_method] || order.payment_method}
                </p>
                {order.payment_method === "cash" && order.change_for && order.change_for > 0 && (
                  <div 
                    className="mt-2 pt-2 border-t space-y-1 text-sm"
                    data-testid="order-tracking-change-info"
                  >
                    <p className="text-muted-foreground">
                      Troco para: <span className="font-medium text-foreground">{formatPrice(order.change_for)}</span>
                    </p>
                    <p className="text-primary font-medium">
                      Levar troco: {formatPrice(order.change_for - order.total)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card data-testid="order-tracking-notes-card">
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent data-testid="order-tracking-notes-content">
                  <p className="text-sm">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
