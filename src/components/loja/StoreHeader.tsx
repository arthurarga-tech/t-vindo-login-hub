import { Store, Clock, Phone, Package } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentDayInSaoPaulo, getCurrentMinutesInSaoPaulo } from "@/lib/dateUtils";

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

interface StoreHeaderProps {
  establishmentName: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  phone?: string | null;
  openingHours?: OpeningHours | null;
  primaryColor?: string | null;
}

const dayKeys: Array<keyof OpeningHours> = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getCurrentDayStatus(openingHours?: OpeningHours | null): {
  isOpen: boolean;
  text: string;
} {
  if (!openingHours) return { isOpen: true, text: "" };

  const dayIndex = getCurrentDayInSaoPaulo();
  const currentDay = dayKeys[dayIndex];
  const dayHours = openingHours[currentDay];

  if (!dayHours || dayHours.closed) {
    return { isOpen: false, text: "Fechado hoje" };
  }

  const currentTime = getCurrentMinutesInSaoPaulo();
  const [openHour, openMin] = dayHours.open.split(":").map(Number);
  const [closeHour, closeMin] = dayHours.close.split(":").map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  if (currentTime >= openTime && currentTime <= closeTime) {
    return { isOpen: true, text: `Aberto até ${dayHours.close}` };
  } else if (currentTime < openTime) {
    return { isOpen: false, text: `Abre às ${dayHours.open}` };
  } else {
    return { isOpen: false, text: "Fechado agora" };
  }
}

export function StoreHeader({ establishmentName, logoUrl, bannerUrl, phone, openingHours, primaryColor }: StoreHeaderProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const status = getCurrentDayStatus(openingHours);
  
  // Use custom primary color or fallback
  const headerStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;

  return (
    <header className="sticky top-0 z-50">
      {/* Banner */}
      {bannerUrl && (
        <div className="relative h-32 sm:h-40 md:h-52 w-full overflow-hidden">
          <img
            src={bannerUrl}
            alt={`Banner de ${establishmentName}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        </div>
      )}
      
      {/* Header bar */}
      <div 
        className={`bg-primary text-primary-foreground py-3 sm:py-4 shadow-md ${bannerUrl ? '-mt-12 sm:-mt-16 relative' : ''}`}
        style={headerStyle}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={establishmentName}
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover bg-primary-foreground/10 border-2 border-primary-foreground/20 flex-shrink-0"
                />
              ) : (
                <Store className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold truncate">{establishmentName}</h1>
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  {phone && (
                    <div className="flex items-center gap-1 opacity-90">
                      <Phone className="h-3 w-3" />
                      <span>{phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Track order button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 sm:px-3 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                onClick={() => navigate(`/loja/${slug}/rastrear`)}
              >
                <Package className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs sm:text-sm">Acompanhar Pedido</span>
              </Button>
              
              {/* Status badge in highlight */}
              {openingHours && (
                <Badge 
                  variant={status.isOpen ? "default" : "destructive"}
                  className={`text-xs px-2 sm:px-3 py-1 ${status.isOpen ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{status.isOpen ? "Aberto" : "Fechado"}</span>
                  <span className="sm:hidden">{status.isOpen ? "✓" : "✕"}</span>
                </Badge>
              )}
              <CartDrawer />
            </div>
          </div>
          
          {/* Status text below header on mobile */}
          {openingHours && status.text && (
            <div className="mt-1 sm:mt-2 text-xs opacity-80 text-center sm:text-left">
              {status.text}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
