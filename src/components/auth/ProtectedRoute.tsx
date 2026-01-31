import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: subscription, isLoading: isLoadingSubscription } = useSubscription();
  const location = useLocation();

  if (loading || isLoadingSubscription) {
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

  return <>{children}</>;
}

export default ProtectedRoute;
