import { useState } from "react";
import { MapPin, Phone, Clock, Truck, Info, Timer, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatPrice } from "@/lib/formatters";
import type { OpeningHours } from "@/types/establishment";

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
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasAddress = address || neighborhood || city;
  const hasDeliveryInfo = deliveryInfo || (minOrderValue && minOrderValue > 0);
  const hasAnyInfo = description || phone || hasAddress || openingHours || hasDeliveryInfo || estimatedTime;

  if (!hasAnyInfo) return null;

  const fullAddress = [address, neighborhood, city].filter(Boolean).join(", ");
  const shortLocation = [neighborhood, city].filter(Boolean).join(", ");

  // Format estimated time display
  const getEstimatedTimeLabel = () => {
    if (!estimatedTime) return null;
    
    if (estimatedTime.mode === "manual" && estimatedTime.deliveryMinutes > 0) {
      return `${estimatedTime.preparationMinutes}-${estimatedTime.totalMinutes} min`;
    }
    return `~${estimatedTime.totalMinutes} min`;
  };

  const hasExpandableContent = description || phone || (hasAddress && address) || openingHours || hasDeliveryInfo;

  return (
    <Collapsible 
      open={isExpanded} 
      onOpenChange={setIsExpanded}
      className="mb-4"
    >
      {/* Compact summary - always visible */}
      <div 
        className="bg-card border border-border rounded-lg overflow-hidden"
        data-testid="store-info"
        role="region"
        aria-label="Informações da loja"
      >
        <CollapsibleTrigger 
          className="w-full p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
          data-testid="store-info-toggle"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-4 text-sm flex-wrap">
            {/* Estimated time */}
            {estimatedTime && (
              <div 
                className="flex items-center gap-1.5 text-foreground"
                data-testid="store-info-estimated-time"
              >
                <Timer className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))]" />
                <span className="font-medium">{getEstimatedTimeLabel()}</span>
              </div>
            )}
            
            {/* Short location */}
            {shortLocation && (
              <div 
                className="flex items-center gap-1.5 text-muted-foreground"
                data-testid="store-info-short-location"
              >
                <MapPin className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))]" />
                <span>{shortLocation}</span>
              </div>
            )}
            
            {/* Min order if no other info */}
            {!estimatedTime && !shortLocation && minOrderValue && minOrderValue > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))]" />
                <span>Mín. {formatPrice(minOrderValue)}</span>
              </div>
            )}
          </div>
          
          {hasExpandableContent && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs flex-shrink-0">
              <span className="hidden sm:inline">{isExpanded ? "Ver menos" : "Ver mais"}</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          )}
        </CollapsibleTrigger>

        {/* Expandable content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
            {/* Description */}
            {description && (
              <div 
                className="flex gap-2 pt-2"
                data-testid="store-info-description"
              >
                <Info className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            )}

            {/* Contact & Full Address */}
            <div className="flex flex-col gap-2">
              {phone && (
                <a
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-2 text-sm hover:text-[hsl(var(--store-primary,var(--primary)))] transition-colors"
                  data-testid="store-info-phone"
                  aria-label={`Telefone: ${phone}`}
                >
                  <Phone className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))]" />
                  <span>{phone}</span>
                </a>
              )}

              {hasAddress && address && (
                <div 
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                  data-testid="store-info-address"
                >
                  <MapPin className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))] flex-shrink-0 mt-0.5" />
                  <span>{fullAddress}</span>
                </div>
              )}
            </div>

            {/* Opening Hours - Compact list format */}
            {openingHours && (
              <div 
                className="space-y-2"
                data-testid="store-info-hours"
                role="region"
                aria-label="Horários de funcionamento"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))]" />
                  <span>Horários</span>
                </div>
                <div 
                  className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pl-6"
                  role="list"
                >
                  {dayOrder.map((day) => {
                    const hours = openingHours[day];
                    return (
                      <div
                        key={day}
                        className="flex justify-between"
                        data-testid={`store-info-hours-${day}`}
                        role="listitem"
                      >
                        <span className="font-medium text-foreground">{dayLabels[day]}</span>
                        <span>
                          {hours?.closed ? "Fechado" : `${hours?.open} - ${hours?.close}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery Info */}
            {hasDeliveryInfo && (
              <div 
                className="space-y-1"
                data-testid="store-info-delivery"
                role="region"
                aria-label="Informações de entrega"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Truck className="h-4 w-4 text-[hsl(var(--store-primary,var(--primary)))]" />
                  <span>Entrega</span>
                </div>
                <div className="text-xs text-muted-foreground pl-6 space-y-0.5">
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
