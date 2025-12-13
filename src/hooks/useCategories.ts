import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Category {
  id: string;
  establishment_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  order_position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  image_url?: string;
  active?: boolean;
}

export function useCategories(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ["categories", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!establishmentId,
  });
}

export function useCreateCategory(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!establishmentId) throw new Error("Estabelecimento não encontrado");

      // Get max order position
      const { data: categories } = await supabase
        .from("categories")
        .select("order_position")
        .eq("establishment_id", establishmentId)
        .order("order_position", { ascending: false })
        .limit(1);

      const maxPosition = categories?.[0]?.order_position ?? -1;

      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert({
          establishment_id: establishmentId,
          name: data.name,
          description: data.description || null,
          image_url: data.image_url || null,
          active: data.active ?? true,
          order_position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return newCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", establishmentId] });
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });
}

export function useUpdateCategory(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      const { data: updated, error } = await supabase
        .from("categories")
        .update({
          name: data.name,
          description: data.description,
          image_url: data.image_url,
          active: data.active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", establishmentId] });
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });
}

export function useDeleteCategory(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", establishmentId] });
      toast.success("Categoria excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir categoria: " + error.message);
    },
  });
}

export function useReorderCategories(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categories: { id: string; order_position: number }[]) => {
      const updates = categories.map(({ id, order_position }) =>
        supabase.from("categories").update({ order_position }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", establishmentId] });
    },
    onError: (error) => {
      toast.error("Erro ao reordenar categorias: " + error.message);
    },
  });
}
