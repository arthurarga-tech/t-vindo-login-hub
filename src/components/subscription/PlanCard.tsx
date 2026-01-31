import { Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  discount?: string;
  features: string[];
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PlanCard({
  name,
  price,
  originalPrice,
  period,
  discount,
  features,
  isCurrentPlan,
  isPopular,
  onSelect,
  isLoading,
  disabled,
}: PlanCardProps) {
  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);

  const formattedOriginalPrice = originalPrice
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(originalPrice)
    : null;

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isCurrentPlan && "border-primary ring-2 ring-primary",
        isPopular && !isCurrentPlan && "border-primary/50"
      )}
    >
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Seu Plano
        </Badge>
      )}
      {isPopular && !isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">
          Mais Popular
        </Badge>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>{period}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="text-center mb-6">
          {discount && (
            <Badge variant="outline" className="mb-2 text-green-600 border-green-600">
              {discount} de desconto
            </Badge>
          )}
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold">{formattedPrice}</span>
          </div>
          {formattedOriginalPrice && (
            <p className="text-sm text-muted-foreground line-through">
              {formattedOriginalPrice}
            </p>
          )}
        </div>

        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : "default"}
          onClick={onSelect}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isCurrentPlan ? "Gerenciar Assinatura" : "Assinar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
