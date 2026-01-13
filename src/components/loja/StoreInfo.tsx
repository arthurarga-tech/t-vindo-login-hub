import { MapPin, Phone, Clock, Truck, Info, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface StoreInfoProps {
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  openingHours?: OpeningHours | null;
  deliveryInfo?: string | null;
  minOrderValue?: number | null;
  estimatedTime?: {
    preparationMinutes: number;
    deliveryMinutes: number;
    totalMinutes: number;
    mode: "auto_daily" | "manual";
  } | null;
}

const dayLabels: Record<keyof OpeningHours, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom",
};

const dayOrder: Array<keyof OpeningHours> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function StoreInfo({
  description,
  phone,
  address,
  neighborhood,
  city,
  openingHours,
  deliveryInfo,
  minOrderValue,
  estimatedTime,
}: StoreInfoProps) {
  const hasAddress = address || neighborhood || city;
  const hasDeliveryInfo = deliveryInfo || (minOrderValue && minOrderValue > 0);
  const hasAnyInfo = description || phone || hasAddress || openingHours || hasDeliveryInfo || estimatedTime;

  if (!hasAnyInfo) return null;

  const fullAddress = [address, neighborhood, city].filter(Boolean).join(", ");

  // Format estimated time display
  const getEstimatedTimeLabel = () => {
    if (!estimatedTime) return null;
    
    if (estimatedTime.mode === "manual" && estimatedTime.deliveryMinutes > 0) {
      return `${estimatedTime.preparationMinutes}-${estimatedTime.totalMinutes} min`;
    }
    return `~${estimatedTime.totalMinutes} min`;
  };

  return (
    <Card 
      className="mb-6"
      data-testid="store-info"
      role="region"
      aria-label="Informações da loja"
    >
      <CardContent className="p-4 space-y-4">
        {/* Estimated Time Badge */}
        {estimatedTime && (
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1.5 text-sm py-1 px-3"
              data-testid="store-info-estimated-time"
            >
              <Timer className="h-4 w-4" />
              <span>Tempo estimado: {getEstimatedTimeLabel()}</span>
            </Badge>
          </div>
        )}

        {/* Description */}
        {description && (
          <div 
            className="flex gap-3"
            data-testid="store-info-description"
          >
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}

        {/* Contact & Address */}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {phone && (
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              data-testid="store-info-phone"
              aria-label={`Telefone: ${phone}`}
            >
              <Phone className="h-4 w-4 text-primary" />
              <span>{phone}</span>
            </a>
          )}

          {hasAddress && (
            <div 
              className="flex items-center gap-2 text-sm"
              data-testid="store-info-address"
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span>{fullAddress}</span>
            </div>
          )}
        </div>

        {/* Opening Hours */}
        {openingHours && (
          <div 
            className="space-y-2"
            data-testid="store-info-hours"
            role="region"
            aria-label="Horários de funcionamento"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" />
              <span>Horários de Funcionamento</span>
            </div>
            <div 
              className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs"
              role="list"
            >
              {dayOrder.map((day) => {
                const hours = openingHours[day];
                return (
                  <div
                    key={day}
                    className={`p-2 rounded-md text-center ${
                      hours?.closed
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-foreground"
                    }`}
                    data-testid={`store-info-hours-${day}`}
                    role="listitem"
                  >
                    <div className="font-medium">{dayLabels[day]}</div>
                    <div className="mt-1">
                      {hours?.closed ? (
                        "Fechado"
                      ) : (
                        <>
                          {hours?.open}
                          <br />
                          {hours?.close}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery Info */}
        {hasDeliveryInfo && (
          <div 
            className="space-y-2"
            data-testid="store-info-delivery"
            role="region"
            aria-label="Informações de entrega"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary" />
              <span>Entrega</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {minOrderValue && minOrderValue > 0 && (
                <p data-testid="store-info-min-order">
                  Pedido mínimo: {formatPrice(minOrderValue)}
                </p>
              )}
              {deliveryInfo && (
                <p data-testid="store-info-delivery-text">{deliveryInfo}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
