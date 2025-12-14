import { Store, Clock, Phone } from "lucide-react";
import { CartDrawer } from "./CartDrawer";

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

export function StoreHeader({ establishmentName, logoUrl, phone, openingHours }: StoreHeaderProps) {
  const status = getCurrentDayStatus(openingHours);

  return (
    <header className="bg-primary text-primary-foreground py-4 shadow-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={establishmentName}
                className="h-10 w-10 rounded-full object-cover bg-primary-foreground/10"
              />
            ) : (
              <Store className="h-7 w-7" />
            )}
            <div>
              <h1 className="text-xl font-bold">{establishmentName}</h1>
              <div className="flex items-center gap-3 text-xs opacity-90">
                {openingHours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span
                      className={status.isOpen ? "text-green-300" : "text-red-300"}
                    >
                      {status.text}
                    </span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
