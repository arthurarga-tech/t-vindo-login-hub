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

// Fetch addons for a product (category addons + product-specific addons)
export function usePublicAddonsForProduct(productId: string | undefined, categoryId: string | undefined) {
  return useQuery({
    queryKey: ["public-addons-for-product", productId, categoryId],
    queryFn: async () => {
      if (!productId) return { groups: [], addons: [] };

      // 1. Fetch category addon groups
      let categoryGroups: AddonGroup[] = [];
      if (categoryId) {
        const { data: catGroups, error: catError } = await supabase
          .from("addon_groups")
          .select("*")
          .eq("category_id", categoryId)
          .eq("active", true)
          .order("order_position", { ascending: true });

        if (catError) throw catError;
        categoryGroups = (catGroups || []) as AddonGroup[];
      }

      // 2. Fetch product-specific addon groups
      const { data: productLinks, error: linkError } = await supabase
        .from("product_addon_groups")
        .select(`
          addon_group:addon_groups(*)
        `)
        .eq("product_id", productId);

      if (linkError) throw linkError;

      const productGroups = (productLinks || [])
        .map((pl: any) => pl.addon_group)
        .filter((g: AddonGroup | null) => g && g.active) as AddonGroup[];

      // 3. Merge and deduplicate groups
      const allGroupsMap = new Map<string, AddonGroup>();
      [...categoryGroups, ...productGroups].forEach((g) => {
        if (!allGroupsMap.has(g.id)) {
          allGroupsMap.set(g.id, g);
        }
      });
      const allGroups = Array.from(allGroupsMap.values());

      if (allGroups.length === 0) {
        return { groups: [], addons: [] };
      }

      // 4. Fetch addons for all groups
      const groupIds = allGroups.map((g) => g.id);
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
    enabled: !!productId,
  });
}
