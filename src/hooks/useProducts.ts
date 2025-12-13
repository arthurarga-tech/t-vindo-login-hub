import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Product {
  id: string;
  establishment_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  image_url?: string;
  active?: boolean;
}

export function useProducts(establishmentId: string | undefined, categoryId?: string | null) {
  return useQuery({
    queryKey: ["products", establishmentId, categoryId],
    queryFn: async () => {
      if (!establishmentId) return [];

      let query = supabase
        .from("products")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("order_position", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!establishmentId,
  });
}

export function useCreateProduct(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!establishmentId) throw new Error("Estabelecimento não encontrado");

      // Get max order position
      const { data: products } = await supabase
        .from("products")
        .select("order_position")
        .eq("establishment_id", establishmentId)
        .order("order_position", { ascending: false })
        .limit(1);

      const maxPosition = products?.[0]?.order_position ?? -1;

      const { data: newProduct, error } = await supabase
        .from("products")
        .insert({
          establishment_id: establishmentId,
          category_id: data.category_id || null,
          name: data.name,
          description: data.description || null,
          price: data.price,
          image_url: data.image_url || null,
          active: data.active ?? true,
          order_position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
      toast.success("Produto criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });
}

export function useUpdateProduct(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const { data: updated, error } = await supabase
        .from("products")
        .update({
          name: data.name,
          description: data.description,
          price: data.price,
          category_id: data.category_id,
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
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });
}

export function useDeleteProduct(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
      toast.success("Produto excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir produto: " + error.message);
    },
  });
}

export function useReorderProducts(establishmentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (products: { id: string; order_position: number }[]) => {
      const updates = products.map(({ id, order_position }) =>
        supabase.from("products").update({ order_position }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", establishmentId] });
    },
    onError: (error) => {
      toast.error("Erro ao reordenar produtos: " + error.message);
    },
  });
}
