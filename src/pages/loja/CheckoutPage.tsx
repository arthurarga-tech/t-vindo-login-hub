import { useParams } from "react-router-dom";
import { usePublicEstablishment } from "@/hooks/usePublicStore";
import { CartProvider } from "@/hooks/useCart";
import { CheckoutForm } from "@/components/loja/CheckoutForm";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: establishment, isLoading } = usePublicEstablishment(slug);

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

  return (
    <CartProvider establishmentSlug={slug || ""}>
      <CheckoutForm />
    </CartProvider>
  );
}
