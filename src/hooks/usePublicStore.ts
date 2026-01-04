import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "./useCategories";

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  order_position: number;
}

export function usePublicEstablishment(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-establishment", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("establishments")
        .select(`
          id, name, slug, description, logo_url, banner_url, phone, address, neighborhood, city, 
          opening_hours, delivery_info, min_order_value, theme_primary_color, theme_secondary_color, 
          service_delivery, service_pickup, service_dine_in, allow_scheduling,
          payment_pix_enabled, payment_credit_enabled, payment_debit_enabled, payment_cash_enabled,
          pix_key, pix_key_type, pix_holder_name, delivery_fee
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export function usePublicCategories(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ["public-categories", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("active", true)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!establishmentId,
  });
}

export function usePublicProducts(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ["public-products", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, category_id, order_position")
        .eq("establishment_id", establishmentId)
        .eq("active", true)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as PublicProduct[];
    },
    enabled: !!establishmentId,
  });
}
