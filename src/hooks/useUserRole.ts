import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "owner" | "manager" | "attendant" | "kitchen" | "waiter" | "employee";

const rolePermissions: Record<AppRole, string[]> = {
  owner: ["pedidos", "mesas", "financeiro", "catalogo", "meu-negocio", "clientes", "usuarios", "meu-plano", "configuracoes"],
  manager: ["pedidos", "mesas", "financeiro", "catalogo", "meu-negocio", "clientes", "configuracoes"],
  attendant: ["pedidos", "mesas", "catalogo", "clientes"],
  kitchen: ["pedidos"],
  waiter: ["pedidos", "mesas"],
  employee: ["pedidos", "mesas", "catalogo", "clientes"],
};

export const roleLabels: Record<AppRole, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  attendant: "Atendente",
  kitchen: "Cozinha",
  waiter: "Garçom",
  employee: "Funcionário",
};

export function useUserRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: membership, error } = await supabase
        .from("establishment_members")
        .select("role, establishment_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!membership) return null;

      return {
        role: membership.role as AppRole,
        establishmentId: membership.establishment_id,
      };
    },
    enabled: !!user?.id,
  });

  const role = data?.role ?? null;
  const isOwner = role === "owner";

  const canAccess = (page: string): boolean => {
    if (!role) return false;
    return rolePermissions[role]?.includes(page) ?? false;
  };

  const getFirstAllowedPage = (): string => {
    if (!role) return "/dashboard/pedidos";
    const pages = rolePermissions[role];
    return `/dashboard/${pages[0]}`;
  };

  return {
    role,
    isOwner,
    isLoading,
    canAccess,
    getFirstAllowedPage,
    roleLabels,
    rolePermissions,
  };
}
