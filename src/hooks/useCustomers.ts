import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";
import { toast } from "sonner";
import { SortOption } from "@/components/clientes/CustomerFilters";

export interface CustomerWithStats {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

export interface CustomerOrder {
  id: string;
  order_number: number;
  status: string;
  total: number;
  payment_method: string;
  created_at: string;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    total: number;
  }[];
}

export interface CustomerFiltersParams {
  search?: string;
  neighborhood?: string;
  sortBy?: SortOption;
}

export interface CustomersPaginationParams {
  page: number;
  pageSize: number;
}

export interface CustomersResult {
  customers: CustomerWithStats[];
  totalCount: number;
  neighborhoods: string[];
}

export function useCustomers(
  filters: CustomerFiltersParams = {},
  pagination: CustomersPaginationParams = { page: 1, pageSize: 50 }
) {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["customers", establishment?.id, filters, pagination],
    queryFn: async (): Promise<CustomersResult> => {
      if (!establishment?.id) {
        return { customers: [], totalCount: 0, neighborhoods: [] };
      }

      const offset = (pagination.page - 1) * pagination.pageSize;

      // Call the RPC function to get customers with stats
      const { data, error } = await supabase.rpc("get_customers_with_stats", {
        p_establishment_id: establishment.id,
        p_limit: pagination.pageSize,
        p_offset: offset,
        p_search: filters.search || null,
        p_neighborhood: filters.neighborhood || null,
        p_sort_by: filters.sortBy || "recent",
      });

      if (error) throw error;

      // Get unique neighborhoods for filter (separate query, cached)
      const { data: allCustomers } = await supabase
        .from("customers")
        .select("neighborhood")
        .eq("establishment_id", establishment.id)
        .not("neighborhood", "is", null)
        .neq("neighborhood", "Localização via WhatsApp");

      const neighborhoods = Array.from(
        new Set(allCustomers?.map((c) => c.neighborhood).filter(Boolean) as string[])
      ).sort();

      const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;

      const customers: CustomerWithStats[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        address: row.address,
        address_number: row.address_number,
        address_complement: row.address_complement,
        neighborhood: row.neighborhood,
        city: row.city,
        created_at: row.created_at,
        updated_at: row.updated_at,
        total_orders: Number(row.total_orders),
        total_spent: Number(row.total_spent),
        last_order_at: row.last_order_at,
      }));

      return {
        customers,
        totalCount,
        neighborhoods,
      };
    },
    enabled: !!establishment?.id,
  });
}

export function useCustomerStats(filters: CustomerFiltersParams = {}) {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["customer-stats", establishment?.id, filters],
    queryFn: async () => {
      if (!establishment?.id) {
        return { total: 0, withOrders: 0, totalRevenue: 0, avgTicket: 0 };
      }

      const { data, error } = await supabase.rpc("get_customer_stats_summary", {
        p_establishment_id: establishment.id,
        p_search: filters.search || null,
        p_neighborhood: filters.neighborhood || null,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return { total: 0, withOrders: 0, totalRevenue: 0, avgTicket: 0 };
      }

      const stats = data[0];
      const totalOrders = Number(stats.total_orders) || 0;
      const totalRevenue = Number(stats.total_revenue) || 0;

      return {
        total: Number(stats.total_customers) || 0,
        withOrders: Number(stats.customers_with_orders) || 0,
        totalRevenue,
        avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      };
    },
    enabled: !!establishment?.id,
  });
}

export function useCustomerOrders(customerId: string | null) {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: async () => {
      if (!customerId || !establishment?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          total,
          payment_method,
          created_at,
          items:order_items(
            id,
            product_name,
            quantity,
            total
          )
        `)
        .eq("customer_id", customerId)
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomerOrder[];
    },
    enabled: !!customerId && !!establishment?.id,
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
      toast.success("Cliente excluído com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao excluir cliente: " + error.message);
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      phone: string;
      address?: string | null;
      address_number?: string | null;
      address_complement?: string | null;
      neighborhood?: string | null;
      city?: string | null;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
      toast.success("Cliente atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar cliente: " + error.message);
    },
  });
}
