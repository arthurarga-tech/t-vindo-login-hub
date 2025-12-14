import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AddonGroup {
  id: string;
  establishment_id: string;
  category_id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  required: boolean;
  order_position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Addon {
  id: string;
  addon_group_id: string;
  name: string;
  price: number;
  active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface AddonGroupFormData {
  name: string;
  min_selections: number;
  max_selections: number;
  required: boolean;
  active?: boolean;
}

export interface AddonFormData {
  name: string;
  price: number;
  active?: boolean;
}

// Fetch addon groups for a category
export function useAddonGroups(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["addon-groups", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("addon_groups")
        .select("*")
        .eq("category_id", categoryId)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as AddonGroup[];
    },
    enabled: !!categoryId,
  });
}

// Fetch addons for a group
export function useAddons(addonGroupId: string | undefined) {
  return useQuery({
    queryKey: ["addons", addonGroupId],
    queryFn: async () => {
      if (!addonGroupId) return [];

      const { data, error } = await supabase
        .from("addons")
        .select("*")
        .eq("addon_group_id", addonGroupId)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as Addon[];
    },
    enabled: !!addonGroupId,
  });
}

// Fetch all addons for multiple groups
export function useAddonsForGroups(groupIds: string[]) {
  return useQuery({
    queryKey: ["addons-for-groups", groupIds],
    queryFn: async () => {
      if (groupIds.length === 0) return [];

      const { data, error } = await supabase
        .from("addons")
        .select("*")
        .in("addon_group_id", groupIds)
        .eq("active", true)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as Addon[];
    },
    enabled: groupIds.length > 0,
  });
}

// Create addon group
export function useCreateAddonGroup(establishmentId: string | undefined, categoryId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddonGroupFormData) => {
      if (!establishmentId || !categoryId) throw new Error("Missing IDs");

      const { data: existing } = await supabase
        .from("addon_groups")
        .select("order_position")
        .eq("category_id", categoryId)
        .order("order_position", { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].order_position + 1 : 0;

      const { data: result, error } = await supabase
        .from("addon_groups")
        .insert({
          ...data,
          establishment_id: establishmentId,
          category_id: categoryId,
          order_position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-groups", categoryId] });
      toast.success("Grupo de adicionais criado");
    },
    onError: () => {
      toast.error("Erro ao criar grupo de adicionais");
    },
  });
}

// Update addon group
export function useUpdateAddonGroup(categoryId: string | undefined) {
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
      queryClient.invalidateQueries({ queryKey: ["addon-groups", categoryId] });
      toast.success("Grupo de adicionais atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar grupo de adicionais");
    },
  });
}

// Delete addon group
export function useDeleteAddonGroup(categoryId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addon_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-groups", categoryId] });
      toast.success("Grupo de adicionais excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir grupo de adicionais");
    },
  });
}

// Create addon
export function useCreateAddon(addonGroupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddonFormData) => {
      if (!addonGroupId) throw new Error("Missing addon group ID");

      const { data: existing } = await supabase
        .from("addons")
        .select("order_position")
        .eq("addon_group_id", addonGroupId)
        .order("order_position", { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].order_position + 1 : 0;

      const { data: result, error } = await supabase
        .from("addons")
        .insert({
          ...data,
          addon_group_id: addonGroupId,
          order_position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addons", addonGroupId] });
      toast.success("Adicional criado");
    },
    onError: () => {
      toast.error("Erro ao criar adicional");
    },
  });
}

// Update addon
export function useUpdateAddon(addonGroupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AddonFormData> }) => {
      const { data: result, error } = await supabase
        .from("addons")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addons", addonGroupId] });
      toast.success("Adicional atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar adicional");
    },
  });
}

// Delete addon
export function useDeleteAddon(addonGroupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addons", addonGroupId] });
      toast.success("Adicional excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir adicional");
    },
  });
}
