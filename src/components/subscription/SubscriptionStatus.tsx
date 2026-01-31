import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, Clock, AlertTriangle, XCircle, CreditCard, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Subscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface SubscriptionStatusProps {
  subscription: Subscription;
}

const statusConfig = {
  trialing: {
    label: "Período de Teste",
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
  },
  active: {
    label: "Ativo",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  past_due: {
    label: "Pagamento Pendente",
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertTriangle,
  },
  canceled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  expired: {
    label: "Expirado",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

const cycleLabels: Record<string, string> = {
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual",
};

export function SubscriptionStatus({ subscription }: SubscriptionStatusProps) {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const config = statusConfig[subscription.status];
  const StatusIcon = config.icon;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleManageSubscription = async () => {
    if (!subscription.stripe_customer_id) {
      toast.error("Você ainda não tem uma assinatura ativa");
      return;
    }

    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-portal", {
        body: { establishmentId: subscription.establishment_id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error("Erro ao abrir portal de gerenciamento");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Status da Assinatura</CardTitle>
            <CardDescription>Informações sobre seu plano atual</CardDescription>
          </div>
          <Badge className={config.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Plano</p>
            <p className="font-medium">{subscription.plan?.name || "Sem plano"}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Ciclo de Cobrança</p>
            <p className="font-medium">
              {subscription.billing_cycle 
                ? cycleLabels[subscription.billing_cycle] 
                : "—"}
            </p>
          </div>

          {subscription.status === "trialing" && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Início do Teste</p>
                <p className="font-medium">{formatDate(subscription.trial_starts_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fim do Teste</p>
                <p className="font-medium">{formatDate(subscription.trial_ends_at)}</p>
              </div>
            </>
          )}

          {subscription.status === "active" && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Período Atual</p>
                <p className="font-medium">{formatDate(subscription.current_period_start)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próxima Cobrança</p>
                <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
              </div>
            </>
          )}

          {subscription.status === "past_due" && (
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Prazo para Renovação</p>
              <p className="font-medium text-destructive">
                {formatDate(subscription.grace_period_ends_at)}
              </p>
            </div>
          )}
        </div>

        {subscription.status === "active" && subscription.stripe_customer_id && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleManageSubscription}
            disabled={isLoadingPortal}
          >
            {isLoadingPortal ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Gerenciar Assinatura
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
