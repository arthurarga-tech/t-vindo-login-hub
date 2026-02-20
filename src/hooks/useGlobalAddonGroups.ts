import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AddonGroup, AddonGroupFormData } from "./useAddons";

// Fetch all global addon groups (category_id IS NULL) for an establishment
export function useGlobalAddonGroups(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ["global-addon-groups", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];

      const { data, error } = await supabase
        .from("addon_groups")
        .select("*")
        .eq("establishment_id", establishmentId)
        .is("category_id", null)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as AddonGroup[];
    },
    enabled: !!establishmentId,
  });
}

// Fetch category_addon_groups links for a specific category
export function useCategoryAddonLinks(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["category-addon-links", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("category_addon_groups")
        .select("addon_group_id")
        .eq("category_id", categoryId);

      if (error) throw error;
      return (data || []).map((row: { addon_group_id: string }) => row.addon_group_id);
    },
    enabled: !!categoryId,
  });
}

// Fetch which categories use a global group (for badges)
export function useGroupCategoryLinks(addonGroupId: string | undefined) {
  return useQuery({
    queryKey: ["group-category-links", addonGroupId],
    queryFn: async () => {
      if (!addonGroupId) return [];

      const { data, error } = await supabase
        .from("category_addon_groups")
        .select("category_id, categories(name)")
        .eq("addon_group_id", addonGroupId);

      if (error) throw error;
      return (data || []) as Array<{ category_id: string; categories: { name: string } | null }>;
    },
    enabled: !!addonGroupId,
  });
}

// Create a global addon group (no category_id)
export function useCreateGlobalAddonGroup(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddonGroupFormData) => {
      if (!establishmentId) throw new Error("Missing establishment ID");

      const { data: existing } = await supabase
        .from("addon_groups")
        .select("order_position")
        .eq("establishment_id", establishmentId)
        .is("category_id", null)
        .order("order_position", { ascending: false })
        .limit(1);

      const nextPosition =
        existing && existing.length > 0 ? existing[0].order_position + 1 : 0;

      const { data: result, error } = await supabase
        .from("addon_groups")
        .insert({
          ...data,
          establishment_id: establishmentId,
          category_id: null,
          order_position: nextPosition,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-addon-groups", establishmentId] });
      toast.success("Grupo global criado");
    },
    onError: () => {
      toast.error("Erro ao criar grupo global");
    },
  });
}

// Update a global addon group
export function useUpdateGlobalAddonGroup(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AddonGroupFormData> }) => {
      const { data: result, error } = await supabase
        .from("addon_groups")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-addon-groups", establishmentId] });
      toast.success("Grupo global atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar grupo global");
    },
  });
}

// Delete a global addon group
export function useDeleteGlobalAddonGroup(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addon_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-addon-groups", establishmentId] });
      toast.success("Grupo global excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir grupo global");
    },
  });
}

// Link a global addon group to a category
export function useLinkAddonGroupToCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      addonGroupId,
    }: {
      categoryId: string;
      addonGroupId: string;
    }) => {
      const { error } = await supabase.from("category_addon_groups").insert({
        category_id: categoryId,
        addon_group_id: addonGroupId,
      } as any);

      if (error) throw error;
    },
    onSuccess: (_data, { categoryId, addonGroupId }) => {
      queryClient.invalidateQueries({ queryKey: ["category-addon-links", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["group-category-links", addonGroupId] });
      toast.success("Grupo vinculado à categoria");
    },
    onError: () => {
      toast.error("Erro ao vincular grupo");
    },
  });
}

// Unlink a global addon group from a category
export function useUnlinkAddonGroupFromCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      addonGroupId,
    }: {
      categoryId: string;
      addonGroupId: string;
    }) => {
      const { error } = await supabase
        .from("category_addon_groups")
        .delete()
        .eq("category_id", categoryId)
        .eq("addon_group_id", addonGroupId);

      if (error) throw error;
    },
    onSuccess: (_data, { categoryId, addonGroupId }) => {
      queryClient.invalidateQueries({ queryKey: ["category-addon-links", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["group-category-links", addonGroupId] });
      toast.success("Grupo desvinculado da categoria");
    },
    onError: () => {
      toast.error("Erro ao desvincular grupo");
    },
  });
}
