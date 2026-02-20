import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fetch product_addon_groups links for a specific product (returns group IDs)
export function useProductAddonLinks(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-addon-links", productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from("product_addon_groups")
        .select("addon_group_id")
        .eq("product_id", productId);

      if (error) throw error;
      return (data || []).map((row: { addon_group_id: string }) => row.addon_group_id);
    },
    enabled: !!productId,
  });
}

// Link a global addon group to a product
export function useLinkAddonGroupToProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      addonGroupId,
    }: {
      productId: string;
      addonGroupId: string;
    }) => {
      const { error } = await supabase.from("product_addon_groups").insert({
        product_id: productId,
        addon_group_id: addonGroupId,
      } as any);

      if (error) throw error;
    },
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-addon-links", productId] });
      queryClient.invalidateQueries({ queryKey: ["public-addons-for-product"] });
      toast.success("Grupo vinculado ao produto");
    },
    onError: () => {
      toast.error("Erro ao vincular grupo");
    },
  });
}

// Unlink a global addon group from a product
export function useUnlinkAddonGroupFromProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      addonGroupId,
    }: {
      productId: string;
      addonGroupId: string;
    }) => {
      const { error } = await supabase
        .from("product_addon_groups")
        .delete()
        .eq("product_id", productId)
        .eq("addon_group_id", addonGroupId);

      if (error) throw error;
    },
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-addon-links", productId] });
      queryClient.invalidateQueries({ queryKey: ["public-addons-for-product"] });
      toast.success("Grupo desvinculado do produto");
    },
    onError: () => {
      toast.error("Erro ao desvincular grupo");
    },
  });
}
