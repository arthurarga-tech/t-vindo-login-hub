import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
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
