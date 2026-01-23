import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AddonGroup, Addon } from "./useAddons";

export function usePublicAddonGroups(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["public-addon-groups", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("addon_groups")
        .select("*")
        .eq("category_id", categoryId)
        .eq("active", true)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as AddonGroup[];
    },
    enabled: !!categoryId,
  });
}

export function usePublicAddonsForCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["public-addons-for-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return { groups: [], addons: [] };

      // Fetch active addon groups for the category
      const { data: groups, error: groupsError } = await supabase
        .from("addon_groups")
        .select("*")
        .eq("category_id", categoryId)
        .eq("active", true)
        .order("order_position", { ascending: true });

      if (groupsError) throw groupsError;

      if (!groups || groups.length === 0) {
        return { groups: [], addons: [] };
      }

      const groupIds = groups.map((g) => g.id);

      // Fetch active addons for these groups
      const { data: addons, error: addonsError } = await supabase
        .from("addons")
        .select("*")
        .in("addon_group_id", groupIds)
        .eq("active", true)
        .order("order_position", { ascending: true });

      if (addonsError) throw addonsError;

      return {
        groups: groups as AddonGroup[],
        addons: (addons || []) as Addon[],
      };
    },
    enabled: !!categoryId,
  });
}
