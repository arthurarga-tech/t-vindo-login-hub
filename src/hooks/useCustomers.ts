import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";

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

export function useCustomers() {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["customers", establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return [];

      // Fetch customers
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("establishment_id", establishment.id)
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;

      // Fetch orders for stats
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("customer_id, total, created_at")
        .eq("establishment_id", establishment.id)
        .neq("status", "cancelled");

      if (ordersError) throw ordersError;

      // Calculate stats for each customer
      const customerStats = new Map<string, { total_orders: number; total_spent: number; last_order_at: string | null }>();
      
      orders.forEach((order) => {
        const existing = customerStats.get(order.customer_id) || { 
          total_orders: 0, 
          total_spent: 0, 
          last_order_at: null 
        };
        
        existing.total_orders += 1;
        existing.total_spent += Number(order.total);
        
        if (!existing.last_order_at || new Date(order.created_at) > new Date(existing.last_order_at)) {
          existing.last_order_at = order.created_at;
        }
        
        customerStats.set(order.customer_id, existing);
      });

      // Merge customer data with stats
      const customersWithStats: CustomerWithStats[] = customers.map((customer) => {
        const stats = customerStats.get(customer.id) || { 
          total_orders: 0, 
          total_spent: 0, 
          last_order_at: null 
        };
        
        return {
          ...customer,
          total_orders: stats.total_orders,
          total_spent: stats.total_spent,
          last_order_at: stats.last_order_at,
        };
      });

      return customersWithStats;
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
