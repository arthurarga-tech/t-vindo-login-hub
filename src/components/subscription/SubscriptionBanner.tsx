import { AlertTriangle, Clock, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

export function SubscriptionBanner() {
  const { data: subscription, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading || !subscription) return null;

  const { status, daysRemaining } = subscription;

  // Don't show banner for active subscriptions with more than 7 days remaining
  if (status === "active" && daysRemaining > 7) return null;

  let variant: "default" | "destructive" = "default";
  let icon = <Info className="h-4 w-4" />;
  let message = "";
  let showButton = false;

  switch (status) {
    case "trialing":
      if (daysRemaining <= 7) {
        variant = "default";
        icon = <Clock className="h-4 w-4 text-yellow-600" />;
        message = `Seu período de teste termina em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}. Assine agora para continuar usando o sistema.`;
        showButton = true;
      } else {
        icon = <Clock className="h-4 w-4 text-blue-600" />;
        message = `Você está no período de teste. Faltam ${daysRemaining} dias.`;
        showButton = true;
      }
      break;

    case "past_due":
      variant = "destructive";
      icon = <AlertTriangle className="h-4 w-4" />;
      message = `Sua assinatura venceu! Você tem ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""} para renovar antes de perder o acesso.`;
      showButton = true;
      break;

    case "active":
      if (daysRemaining <= 7) {
        icon = <CheckCircle className="h-4 w-4 text-green-600" />;
        message = `Sua assinatura renova em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}.`;
      }
      break;

    case "canceled":
    case "expired":
      variant = "destructive";
      icon = <AlertTriangle className="h-4 w-4" />;
      message = "Sua assinatura está inativa. Renove para continuar usando o sistema.";
      showButton = true;
      break;

    default:
      return null;
  }

  if (!message) return null;

  return (
    <Alert variant={variant} className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <AlertDescription>{message}</AlertDescription>
      </div>
      {showButton && (
        <Button
          variant={variant === "destructive" ? "outline" : "default"}
          size="sm"
          onClick={() => navigate("/dashboard/meu-plano")}
        >
          {status === "active" ? "Gerenciar" : "Assinar Agora"}
        </Button>
      )}
    </Alert>
  );
}
