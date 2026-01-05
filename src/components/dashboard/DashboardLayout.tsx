import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useMemo } from "react";

// Convert hex to HSL for CSS variables
function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "";

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function DashboardLayout() {
  const { data: establishment } = useEstablishment();
  
  // Generate custom CSS variables for theme
  const customStyles = useMemo(() => {
    const primaryColor = (establishment as any)?.theme_primary_color;
    const secondaryColor = (establishment as any)?.theme_secondary_color;
    
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
          <header className="h-12 sm:h-14 border-b border-border flex items-center px-3 sm:px-4 md:px-6">
            <SidebarTrigger className="mr-2 sm:mr-4" />
            <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">Painel do Estabelecimento</h1>
          </header>
          <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
