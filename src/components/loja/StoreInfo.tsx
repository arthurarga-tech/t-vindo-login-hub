import { MapPin, Phone, Clock, Truck, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
}: StoreInfoProps) {
  const hasAddress = address || neighborhood || city;
  const hasDeliveryInfo = deliveryInfo || (minOrderValue && minOrderValue > 0);
  const hasAnyInfo = description || phone || hasAddress || openingHours || hasDeliveryInfo;

  if (!hasAnyInfo) return null;

  const fullAddress = [address, neighborhood, city].filter(Boolean).join(", ");

  return (
    <Card className="mb-6">
      <CardContent className="p-4 space-y-4">
        {/* Description */}
        {description && (
          <div className="flex gap-3">
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
            >
              <Phone className="h-4 w-4 text-primary" />
              <span>{phone}</span>
            </a>
          )}

          {hasAddress && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{fullAddress}</span>
            </div>
          )}
        </div>

        {/* Opening Hours */}
        {openingHours && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" />
              <span>Horários de Funcionamento</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
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
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary" />
              <span>Entrega</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {minOrderValue && minOrderValue > 0 && (
                <p>Pedido mínimo: {formatPrice(minOrderValue)}</p>
              )}
              {deliveryInfo && <p>{deliveryInfo}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
