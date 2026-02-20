import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// product_addon_groups — direct links (product-exclusive groups)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// product_addon_exclusions — exclusions (block category groups for a product)
// ─────────────────────────────────────────────────────────────────────────────

export function useProductAddonExclusions(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-addon-exclusions", productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from("product_addon_exclusions" as any)
        .select("addon_group_id")
        .eq("product_id", productId);

      if (error) throw error;
      return (data || []).map((row: any) => row.addon_group_id as string);
    },
    enabled: !!productId,
  });
}

export function useExcludeAddonFromProduct() {
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
        .from("product_addon_exclusions" as any)
        .insert({ product_id: productId, addon_group_id: addonGroupId });

      if (error) throw error;
    },
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-addon-exclusions", productId] });
      queryClient.invalidateQueries({ queryKey: ["public-addons-for-product"] });
      toast.success("Adicional ocultado para este produto");
    },
    onError: () => {
      toast.error("Erro ao ocultar adicional");
    },
  });
}

export function useRestoreAddonToProduct() {
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
        .from("product_addon_exclusions" as any)
        .delete()
        .eq("product_id", productId)
        .eq("addon_group_id", addonGroupId);

      if (error) throw error;
    },
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-addon-exclusions", productId] });
      queryClient.invalidateQueries({ queryKey: ["public-addons-for-product"] });
      toast.success("Adicional restaurado para este produto");
    },
    onError: () => {
      toast.error("Erro ao restaurar adicional");
    },
  });
}
