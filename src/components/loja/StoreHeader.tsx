import { Store, Package } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { Button } from "@/components/ui/button";

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
  isStoreOpen?: boolean;
  allowScheduling?: boolean;
  isTemporaryClosed?: boolean;
  nextOpenTime?: { day: string; time: string } | null;
}

export function StoreHeader({ 
  establishmentName, 
  logoUrl, 
  bannerUrl, 
  openingHours, 
  primaryColor, 
  isStoreOpen, 
  allowScheduling = false, 
  isTemporaryClosed = false,
  nextOpenTime
}: StoreHeaderProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Determine status based on temporary closed or opening hours
  const isOpen = isTemporaryClosed ? false : isStoreOpen;
  
  // Build status label
  const getStatusLabel = () => {
    if (isOpen) return "Aberto";
    if (isTemporaryClosed) return "Fechado";
    if (nextOpenTime) {
      return `Abre ${nextOpenTime.day} ${nextOpenTime.time}`;
    }
    return "Fechado";
  };
  
  // Use custom primary color or fallback
  const headerStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;

  return (
    <header 
      className="sticky top-0 z-50"
      data-testid="store-header"
      role="banner"
    >
      {/* Banner */}
      {bannerUrl && (
        <div 
          className="relative h-24 sm:h-40 md:h-52 w-full overflow-hidden"
          data-testid="store-header-banner"
        >
          <img
            src={bannerUrl}
            alt={`Banner de ${establishmentName}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        </div>
      )}
      
      {/* Header bar - Mobile optimized layout */}
      <div 
        className={`bg-primary text-primary-foreground py-3 shadow-md ${bannerUrl ? '-mt-10 sm:-mt-16 relative' : ''}`}
        style={headerStyle}
        data-testid="store-header-bar"
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          {/* Row 1: Logo + Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={establishmentName}
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover bg-primary-foreground/10 border-2 border-primary-foreground/20"
                  data-testid="store-header-logo"
                />
              ) : (
                <Store className="h-8 w-8 sm:h-10 sm:w-10" data-testid="store-header-icon" />
              )}
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Track order button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 sm:px-3 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-primary-foreground/40 hover:border-primary-foreground/60 transition-all active:scale-95"
                onClick={() => navigate(`/loja/${slug}/rastrear`)}
                data-testid="store-header-track-button"
                aria-label="Acompanhar pedido"
              >
                <Package className="h-4 w-4" />
                <span className="ml-1 text-xs sm:text-sm">Acompanhar</span>
              </Button>
              
              <CartDrawer isStoreOpen={isOpen} allowScheduling={allowScheduling} />
            </div>
          </div>
          
          {/* Row 2: Establishment name (full width, no truncation) */}
          <h1 
            className="text-lg sm:text-xl font-bold mt-2 leading-tight"
            data-testid="store-header-name"
          >
            {establishmentName}
          </h1>
          
          {/* Row 3: Status badge with integrated opening time */}
          {openingHours && (
            <div className="mt-2">
              <div 
                className={`inline-flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-full select-none ${
                  isOpen 
                    ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                    : 'bg-red-500/20 text-red-100 border border-red-400/30'
                }`}
                data-testid="store-header-status-badge"
                aria-label={isOpen ? "Loja aberta" : "Loja fechada"}
                role="status"
              >
                <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span>{getStatusLabel()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
