import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePublicEstablishment } from "@/hooks/usePublicStore";
import { CartProvider } from "@/hooks/useCart";
import { CheckoutForm } from "@/components/loja/CheckoutForm";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, ArrowLeft, Calendar } from "lucide-react";
import { useStoreOpeningHours } from "@/hooks/useStoreOpeningHours";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScheduleSelector } from "@/components/loja/ScheduleSelector";
import { hexToHSL } from "@/lib/formatters";

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: establishment, isLoading } = usePublicEstablishment(slug);
  const isTemporaryClosed = (establishment as any)?.temporary_closed ?? false;
  const { isOpen, nextOpenTime } = useStoreOpeningHours(
    (establishment as any)?.opening_hours,
    isTemporaryClosed
  );
  
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);

  const allowScheduling = (establishment as any)?.allow_scheduling ?? false;

  // Generate custom CSS variables for theme
  const customStyles = useMemo(() => {
    const primaryColor = (establishment as any)?.theme_primary_color || "#ea580c";
    const secondaryColor = (establishment as any)?.theme_secondary_color || "#1e293b";
    
    return {
      "--store-primary": hexToHSL(primaryColor),
      "--store-secondary": hexToHSL(secondaryColor),
    } as React.CSSProperties;
  }, [establishment]);

  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-background p-4"
        data-testid="checkout-page-loading"
        aria-busy="true"
        aria-label="Carregando checkout"
      >
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div 
        className="min-h-screen bg-background flex items-center justify-center"
        data-testid="checkout-page-not-found"
        role="alert"
      >
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 
            className="text-2xl font-bold text-foreground"
            data-testid="checkout-page-not-found-title"
          >
            Loja não encontrada
          </h1>
        </div>
      </div>
    );
  }

  // Block checkout if store is closed AND scheduling not allowed
  if (!isOpen && !allowScheduling) {
    return (
      <div 
        className="min-h-screen bg-background flex items-center justify-center p-4" 
        style={customStyles}
        data-testid="checkout-page-closed"
      >
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="h-16 w-16 text-destructive mx-auto" />
            <h2 
              className="text-xl font-semibold"
              data-testid="checkout-page-closed-title"
            >
              Estabelecimento Fechado
            </h2>
            <p 
              className="text-muted-foreground"
              data-testid="checkout-page-closed-message"
            >
              {nextOpenTime
                ? `Não é possível finalizar pedidos no momento. Abrimos ${nextOpenTime.day} às ${nextOpenTime.time}.`
                : "O estabelecimento está fechado no momento. Por favor, retorne mais tarde."}
            </p>
            <Button 
              onClick={() => navigate(`/loja/${slug}`)} 
              className="gap-2"
              data-testid="checkout-page-back-button"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Store is closed but scheduling is allowed - show scheduling option first
  if (!isOpen && allowScheduling && !showScheduler && !scheduledFor) {
    return (
      <div 
        className="min-h-screen bg-background flex items-center justify-center p-4" 
        style={customStyles}
        data-testid="checkout-page-schedule-prompt"
      >
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Calendar className="h-16 w-16 mx-auto" style={{ color: `hsl(var(--store-primary, var(--primary)))` }} />
            <h2 
              className="text-xl font-semibold"
              data-testid="checkout-page-schedule-title"
            >
              Estabelecimento Fechado
            </h2>
            <p 
              className="text-muted-foreground"
              data-testid="checkout-page-schedule-next-open"
            >
              {nextOpenTime
                ? `Abrimos ${nextOpenTime.day} às ${nextOpenTime.time}.`
                : "O estabelecimento está fechado no momento."}
            </p>
            <p 
              className="text-sm"
              data-testid="checkout-page-schedule-message"
            >
              Mas você pode agendar seu pedido para o próximo horário disponível!
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => setShowScheduler(true)} 
                className="gap-2"
                style={{ backgroundColor: `hsl(var(--store-primary, var(--primary)))` }}
                data-testid="checkout-page-schedule-button"
              >
                <Calendar className="h-4 w-4" />
                Agendar Pedido
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/loja/${slug}`)} 
                className="gap-2"
                data-testid="checkout-page-back-to-store-button"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para a loja
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show scheduler interface when scheduling (store closed)
  if (!isOpen && allowScheduling && showScheduler && !scheduledFor) {
    return (
      <div 
        className="min-h-screen bg-background p-4" 
        style={customStyles}
        data-testid="checkout-page-scheduler"
      >
        <div className="max-w-md mx-auto space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => setShowScheduler(false)} 
            className="gap-2"
            data-testid="checkout-page-scheduler-back-button"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <ScheduleSelector
            openingHours={(establishment as any)?.opening_hours}
            onScheduleSelect={setScheduledFor}
            selectedDate={scheduledFor}
          />
        </div>
      </div>
    );
  }

  return (
    <CartProvider establishmentSlug={slug || ""}>
      <div 
        style={customStyles}
        data-testid="checkout-page"
      >
        <CheckoutForm 
          scheduledFor={scheduledFor} 
          allowScheduling={allowScheduling}
          onScheduleChange={setScheduledFor}
          openingHours={(establishment as any)?.opening_hours}
        />
      </div>
    </CartProvider>
  );
}
