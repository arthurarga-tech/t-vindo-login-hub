import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";

export interface FinancialCategory {
  id: string;
  establishment_id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  establishment_id: string;
  category_id: string;
  order_id: string | null;
  type: "income" | "expense";
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  payment_method: string | null;
  description: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  category?: FinancialCategory;
}

export interface FinancialFilters {
  startDate: Date;
  endDate: Date;
  type?: "income" | "expense" | "all";
  categoryId?: string;
  paymentMethod?: string;
}

export interface FinancialSummary {
  grossIncome: number;
  netIncome: number;
  totalFees: number;
  totalExpenses: number;
  balance: number;
}

export function useFinancialCategories() {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["financial-categories", establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return [];

      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("establishment_id", establishment.id)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data as FinancialCategory[];
    },
    enabled: !!establishment?.id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async (category: { name: string; type: "income" | "expense"; icon?: string }) => {
      if (!establishment?.id) throw new Error("Establishment not found");

      const { error } = await supabase
        .from("financial_categories")
        .insert({
          establishment_id: establishment.id,
          name: category.name,
          type: category.type,
          icon: category.icon || null,
          is_default: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; active?: boolean }) => {
      const { error } = await supabase
        .from("financial_categories")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
    },
  });
}

export function useFinancialTransactions(filters: FinancialFilters) {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["financial-transactions", establishment?.id, filters],
    queryFn: async () => {
      if (!establishment?.id) return [];

      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          category:financial_categories(*)
        `)
        .eq("establishment_id", establishment.id)
        .gte("transaction_date", filters.startDate.toISOString().split("T")[0])
        .lte("transaction_date", filters.endDate.toISOString().split("T")[0])
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }

      if (filters.categoryId && filters.categoryId !== "all") {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.paymentMethod && filters.paymentMethod !== "all") {
        query = query.eq("payment_method", filters.paymentMethod);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FinancialTransaction[];
    },
    enabled: !!establishment?.id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { data: establishment } = useEstablishment();

  return useMutation({
    mutationFn: async (transaction: {
      category_id: string;
      type: "income" | "expense";
      gross_amount: number;
      description: string;
      transaction_date: Date;
      payment_method?: string;
    }) => {
      if (!establishment?.id) throw new Error("Establishment not found");

      const { error } = await supabase
        .from("financial_transactions")
        .insert({
          establishment_id: establishment.id,
          category_id: transaction.category_id,
          type: transaction.type,
          gross_amount: transaction.gross_amount,
          fee_amount: 0,
          net_amount: transaction.gross_amount,
          description: transaction.description,
          transaction_date: transaction.transaction_date.toISOString().split("T")[0],
          payment_method: transaction.payment_method || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      category_id,
      gross_amount,
      description,
      transaction_date,
    }: {
      id: string;
      category_id: string;
      gross_amount: number;
      description: string;
      transaction_date: Date;
    }) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          category_id,
          gross_amount,
          net_amount: gross_amount,
          description,
          transaction_date: transaction_date.toISOString().split("T")[0],
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
    },
  });
}

export function useFinancialSummary(filters: FinancialFilters) {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["financial-summary", establishment?.id, filters],
    queryFn: async (): Promise<FinancialSummary> => {
      if (!establishment?.id) {
        return { grossIncome: 0, netIncome: 0, totalFees: 0, totalExpenses: 0, balance: 0 };
      }

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("type, gross_amount, fee_amount, net_amount")
        .eq("establishment_id", establishment.id)
        .gte("transaction_date", filters.startDate.toISOString().split("T")[0])
        .lte("transaction_date", filters.endDate.toISOString().split("T")[0]);

      if (error) throw error;

      const summary = (data || []).reduce(
        (acc, t) => {
          if (t.type === "income") {
            acc.grossIncome += Number(t.net_amount) || 0; // Bruto = vendas - taxas de cartão
            acc.totalFees += Number(t.fee_amount) || 0;
          } else {
            acc.totalExpenses += Number(t.gross_amount) || 0;
          }
          return acc;
        },
        { grossIncome: 0, netIncome: 0, totalFees: 0, totalExpenses: 0, balance: 0 }
      );

      // Líquido = Bruto - Despesas
      summary.netIncome = summary.grossIncome - summary.totalExpenses;
      summary.balance = summary.netIncome;

      return summary;
    },
    enabled: !!establishment?.id,
  });
}

export function useInitializeCategories() {
  const { data: establishment } = useEstablishment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!establishment?.id) throw new Error("Establishment not found");

      const { error } = await supabase.rpc("create_default_financial_categories", {
        est_id: establishment.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
    },
  });
}
