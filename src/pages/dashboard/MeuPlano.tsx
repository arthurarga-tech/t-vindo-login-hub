import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanCard } from "@/components/subscription/PlanCard";
import { SubscriptionStatus } from "@/components/subscription/SubscriptionStatus";
import { ChangePasswordCard } from "@/components/perfil/ChangePasswordCard";
import { useSubscription, useSubscriptionPlans, BillingCycle } from "@/hooks/useSubscription";
import { useEstablishment } from "@/hooks/useEstablishment";
import { supabase } from "@/integrations/supabase/client";

export default function MeuPlano() {
  const { data: subscription, isLoading: isLoadingSub } = useSubscription();
  const { data: plans, isLoading: isLoadingPlans } = useSubscriptionPlans();
  const { data: establishment } = useEstablishment();
  const [loadingCycle, setLoadingCycle] = useState<BillingCycle | null>(null);

  const isLoading = isLoadingSub || isLoadingPlans;

  const handleSubscribe = async (priceId: string, billingCycle: BillingCycle) => {
    if (!establishment?.id) {
      toast.error("Estabelecimento não encontrado");
      return;
    }

    setLoadingCycle(billingCycle);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
        body: {
          priceId,
          billingCycle,
          establishmentId: establishment.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setLoadingCycle(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!establishment?.id) {
      toast.error("Estabelecimento não encontrado");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("stripe-portal", {
        body: { establishmentId: establishment.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error("Erro ao abrir portal de gerenciamento");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const plan = plans?.[0]; // We only have one plan for now
  const isCurrentlySubscribed = subscription?.status === "active";
  const currentBillingCycle = subscription?.billing_cycle;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie sua conta, assinatura e segurança
        </p>
      </div>

      {subscription && <SubscriptionStatus subscription={subscription} />}

      {plan && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Escolha seu Plano</CardTitle>
            </div>
            <CardDescription>
              {isCurrentlySubscribed
                ? "Você pode alterar seu ciclo de cobrança a qualquer momento"
                : "Assine agora e tenha acesso completo ao sistema"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <PlanCard
                name={`${plan.name} Mensal`}
                price={plan.price_monthly}
                period="Cobrança mensal"
                features={plan.features}
                isCurrentPlan={isCurrentlySubscribed && currentBillingCycle === "monthly"}
                onSelect={() =>
                  isCurrentlySubscribed && currentBillingCycle === "monthly"
                    ? handleManageSubscription()
                    : handleSubscribe(plan.stripe_price_id_monthly!, "monthly")
                }
                isLoading={loadingCycle === "monthly"}
                disabled={loadingCycle !== null && loadingCycle !== "monthly"}
              />

              <PlanCard
                name={`${plan.name} Semestral`}
                price={plan.price_semiannual}
                originalPrice={plan.price_monthly * 6}
                period="Cobrança a cada 6 meses"
                discount="8%"
                features={plan.features}
                isCurrentPlan={isCurrentlySubscribed && currentBillingCycle === "semiannual"}
                isPopular
                onSelect={() =>
                  isCurrentlySubscribed && currentBillingCycle === "semiannual"
                    ? handleManageSubscription()
                    : handleSubscribe(plan.stripe_price_id_semiannual!, "semiannual")
                }
                isLoading={loadingCycle === "semiannual"}
                disabled={loadingCycle !== null && loadingCycle !== "semiannual"}
              />

              <PlanCard
                name={`${plan.name} Anual`}
                price={plan.price_annual}
                originalPrice={plan.price_monthly * 12}
                period="Cobrança anual"
                discount="15%"
                features={plan.features}
                isCurrentPlan={isCurrentlySubscribed && currentBillingCycle === "annual"}
                onSelect={() =>
                  isCurrentlySubscribed && currentBillingCycle === "annual"
                    ? handleManageSubscription()
                    : handleSubscribe(plan.stripe_price_id_annual!, "annual")
                }
                isLoading={loadingCycle === "annual"}
                disabled={loadingCycle !== null && loadingCycle !== "annual"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {subscription?.isBlocked && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Bloqueado</CardTitle>
            <CardDescription>
              Sua assinatura está inativa. Para continuar usando o sistema, escolha um plano acima.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <ChangePasswordCard />
    </div>
  );
}
