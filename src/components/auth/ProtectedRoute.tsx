import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

// Map route paths to permission keys
const routePermissionMap: Record<string, string> = {
  "/dashboard/pedidos": "pedidos",
  "/dashboard/mesas": "mesas",
  "/dashboard/financeiro": "financeiro",
  "/dashboard/catalogo": "catalogo",
  "/dashboard/meu-negocio": "meu-negocio",
  "/dashboard/clientes": "clientes",
  "/dashboard/usuarios": "usuarios",
  "/dashboard/meu-plano": "meu-plano",
  "/dashboard/configuracoes": "configuracoes",
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: subscription, isLoading: isLoadingSubscription } = useSubscription();
  const { canAccess, getFirstAllowedPage, isLoading: isLoadingRole } = useUserRole();
  const location = useLocation();

  if (loading || isLoadingSubscription || isLoadingRole) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If subscription is blocked and user is not on the "Meu Plano" page, redirect
  if (subscription?.isBlocked && location.pathname !== "/dashboard/meu-plano") {
    return <Navigate to="/dashboard/meu-plano" replace />;
  }

  // Check route-level permissions
  const permissionKey = routePermissionMap[location.pathname];
  if (permissionKey && !canAccess(permissionKey)) {
    return <Navigate to={getFirstAllowedPage()} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
