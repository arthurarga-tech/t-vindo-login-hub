import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import Pedidos from "./pages/dashboard/Pedidos";
import Financeiro from "./pages/dashboard/Financeiro";
import Catalogo from "./pages/dashboard/Catalogo";
import MeuNegocio from "./pages/dashboard/MeuNegocio";
import Clientes from "./pages/dashboard/Clientes";
import Estoque from "./pages/dashboard/Estoque";
import Delivery from "./pages/dashboard/Delivery";
import Usuarios from "./pages/dashboard/Usuarios";
import Configuracoes from "./pages/dashboard/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard/pedidos" replace />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="catalogo" element={<Catalogo />} />
              <Route path="meu-negocio" element={<MeuNegocio />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="delivery" element={<Delivery />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
