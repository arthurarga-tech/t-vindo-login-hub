import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useMemo } from "react";
import { hexToHSL } from "@/lib/formatters";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function DashboardHeader() {
  const { toggleSidebar, open, isMobile } = useSidebar();

  return (
    <header className="h-12 sm:h-14 border-b border-border flex items-center px-3 sm:px-4 md:px-6">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={toggleSidebar}
              className="mr-3 sm:mr-4 h-9 px-3 flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isMobile ? (
                <Menu className="h-4 w-4" />
              ) : open ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Menu</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {open ? "Recolher menu" : "Expandir menu"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">
        Painel do Estabelecimento
      </h1>
    </header>
  );
}

export function DashboardLayout() {
  const { data: establishment } = useEstablishment();
  
  // Update mobile browser theme-color with establishment's primary color
  useThemeColor(establishment?.theme_primary_color);
  // Generate custom CSS variables for theme
  const customStyles = useMemo(() => {
    const primaryColor = establishment?.theme_primary_color;
    const secondaryColor = establishment?.theme_secondary_color;
    
    const styles: React.CSSProperties & { [key: string]: string } = {};
    
    if (primaryColor) {
      const hsl = hexToHSL(primaryColor);
      if (hsl) {
        styles["--primary"] = hsl;
        styles["--sidebar-primary"] = hsl;
        styles["--ring"] = hsl;
      }
    }
    
    if (secondaryColor) {
      const hsl = hexToHSL(secondaryColor);
      if (hsl) {
        styles["--secondary"] = hsl;
        styles["--sidebar-accent"] = hsl;
      }
    }
    
    return styles;
  }, [establishment]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background" style={customStyles}>
        <DashboardSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            <SubscriptionBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}