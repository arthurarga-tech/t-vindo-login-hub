import { Store, Clock, Phone } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
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

interface StoreHeaderProps {
  establishmentName: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  phone?: string | null;
  openingHours?: OpeningHours | null;
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

  const now = new Date();
  const dayIndex = now.getDay();
  const currentDay = dayKeys[dayIndex];
  const dayHours = openingHours[currentDay];

  if (!dayHours || dayHours.closed) {
    return { isOpen: false, text: "Fechado hoje" };
  }

  const currentTime = now.getHours() * 60 + now.getMinutes();
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

export function StoreHeader({ establishmentName, logoUrl, bannerUrl, phone, openingHours }: StoreHeaderProps) {
  const status = getCurrentDayStatus(openingHours);

  return (
    <header className="sticky top-0 z-50">
      {/* Banner */}
      {bannerUrl && (
        <div className="relative h-40 sm:h-52 w-full overflow-hidden">
          <img
            src={bannerUrl}
            alt={`Banner de ${establishmentName}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        </div>
      )}
      
      {/* Header bar */}
      <div className={`bg-primary text-primary-foreground py-4 shadow-md ${bannerUrl ? '-mt-16 relative' : ''}`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={establishmentName}
                  className="h-12 w-12 rounded-full object-cover bg-primary-foreground/10 border-2 border-primary-foreground/20"
                />
              ) : (
                <Store className="h-7 w-7" />
              )}
              <div>
                <h1 className="text-xl font-bold">{establishmentName}</h1>
                <div className="flex items-center gap-3 text-xs">
                  {phone && (
                    <div className="flex items-center gap-1 opacity-90">
                      <Phone className="h-3 w-3" />
                      <span>{phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Status badge in highlight */}
              {openingHours && (
                <Badge 
                  variant={status.isOpen ? "default" : "destructive"}
                  className={`text-xs px-3 py-1 ${status.isOpen ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {status.isOpen ? "Aberto" : "Fechado"}
                </Badge>
              )}
              <CartDrawer />
            </div>
          </div>
          
          {/* Status text below header on mobile */}
          {openingHours && status.text && (
            <div className="mt-2 text-xs opacity-80 text-center sm:text-left">
              {status.text}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
