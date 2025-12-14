import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Package, Truck, Home, ArrowLeft, MessageCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "bg-yellow-500" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "bg-blue-500" },
  preparing: { label: "Preparando", icon: Package, color: "bg-orange-500" },
  ready: { label: "Pronto", icon: Package, color: "bg-green-500" },
  out_for_delivery: { label: "Saiu para entrega", icon: Truck, color: "bg-purple-500" },
  delivered: { label: "Entregue", icon: Home, color: "bg-green-600" },
  cancelled: { label: "Cancelado", icon: Clock, color: "bg-red-500" },
};

export default function OrderConfirmationPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(*),
          items:order_items(*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const paymentMethodLabels: Record<string, string> = {
    pix: "Pix",
    card: "Cartão",
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
              Pedido #{(order as any).order_number || order.id.slice(0, 6).toUpperCase()} enviado!
            </h2>
            <p className="text-green-700 dark:text-green-500">
              O estabelecimento foi notificado e em breve entrará em contato.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 text-primary">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Você receberá atualizações no WhatsApp</span>
            </div>
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
              Pedido #{(order as any).order_number || order.id.slice(0, 8).toUpperCase()}
            </p>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.product_name}
                </span>
                <span className="font-medium">{formatPrice(item.total)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
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
            <p className="text-sm text-muted-foreground">Pagamento na entrega</p>
            {order.payment_method === "cash" && (order as any).change_for && (order as any).change_for > 0 && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-sm">
                  Troco para: <span className="font-medium">{formatPrice((order as any).change_for)}</span>
                </p>
                <p className="text-sm text-primary font-medium">
                  Troco: {formatPrice((order as any).change_for - order.total)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
