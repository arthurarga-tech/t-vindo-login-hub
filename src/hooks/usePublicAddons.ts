import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AddonGroup, Addon } from "./useAddons";

// Fetch active addon groups linked to a category via category_addon_groups
export function usePublicAddonGroups(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["public-addon-groups", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("category_addon_groups")
        .select("addon_groups!inner(*)")
        .eq("category_id", categoryId)
        .eq("addon_groups.active", true);

      if (error) throw error;
      return (data || []).map((row: any) => row.addon_groups as AddonGroup);
    },
    enabled: !!categoryId,
  });
}

export function usePublicAddonsForCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["public-addons-for-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return { groups: [], addons: [] };

      // Fetch active global addon groups linked via category_addon_groups
      const { data: linkedRows, error: linkedError } = await supabase
        .from("category_addon_groups")
        .select("addon_groups!inner(*)")
        .eq("category_id", categoryId)
        .eq("addon_groups.active", true);

      if (linkedError) throw linkedError;

      const allGroups = (linkedRows || []).map(
        (row: any) => row.addon_groups as AddonGroup
      );

      if (allGroups.length === 0) {
        return { groups: [], addons: [] };
      }

      const groupIds = allGroups.map((g) => g.id);

      // Fetch active addons for all groups
      const { data: addons, error: addonsError } = await supabase
        .from("addons")
        .select("*")
        .in("addon_group_id", groupIds)
        .eq("active", true)
        .order("order_position", { ascending: true });

      if (addonsError) throw addonsError;

      return {
        groups: allGroups,
        addons: (addons || []) as Addon[],
      };
    },
    enabled: !!categoryId,
  });
}
