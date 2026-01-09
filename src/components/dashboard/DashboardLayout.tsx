import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useMemo } from "react";
import { hexToHSL } from "@/lib/formatters";

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
