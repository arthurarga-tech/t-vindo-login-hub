import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "./useCategories";
import { useEffect } from "react";

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
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["public-establishment", slug],
    queryFn: async () => {
      if (!slug) return null;

      // Use establishments_public view for security - excludes sensitive fields like owner_id, card fees
      const { data, error } = await supabase
        .from("establishments_public")
        .select(`
          id, name, slug, description, logo_url, banner_url, phone, address, neighborhood, city, 
          opening_hours, delivery_info, min_order_value, theme_primary_color, theme_secondary_color, 
          service_delivery, service_pickup, service_dine_in, allow_scheduling, temporary_closed,
          payment_pix_enabled, payment_credit_enabled, payment_debit_enabled, payment_cash_enabled,
          pix_key, pix_key_type, pix_holder_name, delivery_fee
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    // Refetch more frequently to catch status changes
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
  });

  // Subscribe to realtime changes for the establishment
  useEffect(() => {
    if (!query.data?.id) return;

    const channel = supabase
      .channel(`public-establishment-${query.data.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'establishments',
          filter: `id=eq.${query.data.id}`,
        },
        () => {
          // Invalidate the query to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ["public-establishment", slug] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.data?.id, slug, queryClient]);

  return query;
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
