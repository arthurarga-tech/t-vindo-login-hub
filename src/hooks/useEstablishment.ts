import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Establishment } from "@/types/establishment";

export function useEstablishment() {
  const { user } = useAuth();

  return useQuery<Establishment | null>({
    queryKey: ["establishment", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First check if user is an owner
      const { data: ownedEstablishment } = await supabase
        .from("establishments")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (ownedEstablishment) return ownedEstablishment;

      // Then check if user is a member
      const { data: membership } = await supabase
        .from("establishment_members")
        .select("establishment_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        const { data: establishment } = await supabase
          .from("establishments")
          .select("*")
          .eq("id", membership.establishment_id)
          .maybeSingle();
        return establishment;
      }

      return null;
    },
    enabled: !!user?.id,
  });
}
