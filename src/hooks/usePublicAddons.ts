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

// Hook that merges category-level addons + product-exclusive addons,
// filtering out any category groups explicitly excluded for this product.
export function usePublicAddonsForProduct(
  productId: string | undefined,
  categoryId: string | undefined
) {
  return useQuery({
    queryKey: ["public-addons-for-product", productId, categoryId],
    queryFn: async () => {
      if (!productId) return { groups: [], addons: [] };

      // Run all three fetches in parallel
      const categoryGroupsPromise = categoryId
        ? supabase
            .from("category_addon_groups")
            .select("addon_groups!inner(*)")
            .eq("category_id", categoryId)
            .eq("addon_groups.active", true)
        : Promise.resolve({ data: [], error: null });

      const productGroupsPromise = supabase
        .from("product_addon_groups")
        .select("addon_groups!inner(*)")
        .eq("product_id", productId)
        .eq("addon_groups.active", true);

      const exclusionsPromise = supabase
        .from("product_addon_exclusions" as any)
        .select("addon_group_id")
        .eq("product_id", productId);

      const [categoryResult, productResult, exclusionsResult] = await Promise.all([
        categoryGroupsPromise,
        productGroupsPromise,
        exclusionsPromise,
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (productResult.error) throw productResult.error;
      // Non-critical: silently ignore exclusions errors (table might not exist yet)
      const exclusionIds = new Set<string>(
        exclusionsResult.error
          ? []
          : ((exclusionsResult.data || []) as any[]).map((row) => row.addon_group_id as string)
      );

      const categoryGroups = (categoryResult.data || []).map(
        (row: any) => row.addon_groups as AddonGroup
      );
      const productGroups = (productResult.data || []).map(
        (row: any) => row.addon_groups as AddonGroup
      );

      // Filter out excluded category groups
      const filteredCategoryGroups = categoryGroups.filter(
        (g) => !exclusionIds.has(g.id)
      );

      // Merge deduplicating by id (category first, then product-exclusive)
      const seen = new Set<string>();
      const allGroups: AddonGroup[] = [];
      for (const g of [...filteredCategoryGroups, ...productGroups]) {
        if (!seen.has(g.id)) {
          seen.add(g.id);
          allGroups.push(g);
        }
      }

      if (allGroups.length === 0) {
        return { groups: [], addons: [] };
      }

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
