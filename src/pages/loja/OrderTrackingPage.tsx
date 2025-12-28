import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Package, Truck, Home, ArrowLeft, Search, XCircle, MapPin, CreditCard } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePublicEstablishment } from "@/hooks/usePublicStore";
import { formatInSaoPaulo } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";

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

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  cash: "Dinheiro",
};

const orderTypeLabels: Record<string, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
  dine_in: "Consumo local",
};

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  total: number;
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

// Statuses that are considered "finalized"
const finalizedStatuses = ["delivered", "picked_up", "served", "cancelled"];

export default function OrderTrackingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState("");
  const [searchedNumber, setSearchedNumber] = useState<number | null>(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  const { data: establishment } = usePublicEstablishment(slug || "");

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
          if (newStatus && statusConfig[newStatus]) {
            toast.success(`Status atualizado: ${statusConfig[newStatus].label}`);
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

  const status = order ? (statusConfig[order.status] || statusConfig.pending) : null;
  const StatusIcon = status?.icon;

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
            <div>
              <h1 className="text-xl font-bold">Acompanhar Pedido</h1>
              {establishment?.name && (
                <p className="text-sm text-primary-foreground/80">{establishment.name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Pedido
            </CardTitle>
            <CardDescription>
              {order && !finalizedStatuses.includes(order.status) 
                ? "Seu último pedido está sendo exibido abaixo"
                : "Digite o número do seu pedido para acompanhar em tempo real"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="number"
                placeholder="Ex: 123"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="flex-1"
                min="1"
              />
              <Button type="submit" disabled={!orderNumber}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && searchedNumber && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* Not Found State */}
        {(isError || (searchedNumber && !isLoading && !order)) && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6 text-center space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Pedido não encontrado</h2>
              <p className="text-muted-foreground">
                Não encontramos nenhum pedido com o número #{searchedNumber}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {order && status && StatusIcon && (
          <>
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pedido #{order.order_number}</span>
                  <Badge className={`${status.color} text-white`}>
                    <StatusIcon className="h-4 w-4 mr-1" />
                    {status.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatInSaoPaulo(order.created_at, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{orderTypeLabels[order.order_type] || order.order_type}</span>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-medium">{formatPrice(item.total)}</span>
                  </div>
                ))}
                <Separator />
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Taxa de entrega</span>
                    <span>{formatPrice(order.delivery_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span style={{ color: "hsl(var(--store-primary, var(--primary)))" }}>{formatPrice(order.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery/Pickup Info */}
            {order.order_type === "delivery" && order.customer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-medium">{order.customer.name}</p>
                  <p>
                    {order.customer.address}, {order.customer.address_number}
                    {order.customer.address_complement && ` - ${order.customer.address_complement}`}
                  </p>
                  <p>
                    {order.customer.neighborhood}
                    {order.customer.city && `, ${order.customer.city}`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{paymentMethodLabels[order.payment_method] || order.payment_method}</p>
                {order.payment_method === "cash" && order.change_for && order.change_for > 0 && (
                  <div className="mt-2 pt-2 border-t space-y-1 text-sm">
                    <p>Troco para: <span className="font-medium">{formatPrice(order.change_for)}</span></p>
                    <p className="text-primary font-medium">
                      Troco: {formatPrice(order.change_for - order.total)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
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
          </>
        )}

        {/* Back to Store Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/loja/${slug}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para a loja
        </Button>
      </main>
    </div>
  );
}