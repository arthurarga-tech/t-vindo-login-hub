import { useParams, useNavigate } from "react-router-dom";
import { usePublicEstablishment } from "@/hooks/usePublicStore";
import { CartProvider } from "@/hooks/useCart";
import { CheckoutForm } from "@/components/loja/CheckoutForm";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { useStoreOpeningHours } from "@/hooks/useStoreOpeningHours";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: establishment, isLoading } = usePublicEstablishment(slug);
  const { isOpen, nextOpenTime } = useStoreOpeningHours((establishment as any)?.opening_hours);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Loja não encontrada</h1>
        </div>
      </div>
    );
  }

  // Block checkout if store is closed
  if (!isOpen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Estabelecimento Fechado</h2>
            <p className="text-muted-foreground">
              {nextOpenTime
                ? `Não é possível finalizar pedidos no momento. Abrimos ${nextOpenTime.day} às ${nextOpenTime.time}.`
                : "O estabelecimento está fechado no momento. Por favor, retorne mais tarde."}
            </p>
            <Button onClick={() => navigate(`/loja/${slug}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CartProvider establishmentSlug={slug || ""}>
      <CheckoutForm />
    </CartProvider>
  );
}
