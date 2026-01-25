import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { startOfMonth, endOfMonth } from "date-fns";
import { getNowInSaoPaulo, formatInSaoPaulo } from "@/lib/dateUtils";
import {
  useFinancialCategories,
  useFinancialTransactions,
  useFinancialSummary,
  useDeleteTransaction,
  useInitializeCategories,
  FinancialTransaction,
} from "@/hooks/useFinancial";
import { FinancialSummaryCards } from "@/components/financeiro/FinancialSummaryCards";
import { FinancialFilters } from "@/components/financeiro/FinancialFilters";
import { FinancialChart } from "@/components/financeiro/FinancialChart";
import { TransactionList } from "@/components/financeiro/TransactionList";
import { ExpenseFormModal } from "@/components/financeiro/ExpenseFormModal";
import { CategoryManagerModal } from "@/components/financeiro/CategoryManagerModal";
import { toast } from "sonner";

type PeriodType = "today" | "yesterday" | "week" | "month" | "quarter" | "custom";

export default function Financeiro() {
  const [period, setPeriod] = useState<PeriodType>("month");
  const [dateRange, setDateRange] = useState(() => {
    const now = getNowInSaoPaulo();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  });
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [categoryId, setCategoryId] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useFinancialCategories();
  const initializeCategories = useInitializeCategories();

  // Initialize default categories if none exist
  useEffect(() => {
    if (!categoriesLoading && categories.length === 0) {
      initializeCategories.mutate();
    }
  }, [categoriesLoading, categories.length]);

  const filters = {
    startDate: dateRange.start,
    endDate: dateRange.end,
    type: type === "all" ? undefined : type,
    categoryId: categoryId === "all" ? undefined : categoryId,
    paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
  };

  const { data: transactions = [], isLoading: transactionsLoading } = useFinancialTransactions(filters);
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  const deleteTransaction = useDeleteTransaction();

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction.mutateAsync(id);
      toast.success("Lançamento excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setExpenseModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setExpenseModalOpen(open);
    if (!open) {
      setEditingTransaction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
      </div>

      {/* Summary Cards */}
      <FinancialSummaryCards
        summary={summary || { grossIncome: 0, netIncome: 0, totalFees: 0, totalExpenses: 0, balance: 0 }}
        isLoading={summaryLoading}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <FinancialFilters
            period={period}
            onPeriodChange={setPeriod}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            type={type}
            onTypeChange={setType}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            categories={categories}
            onAddExpense={() => setExpenseModalOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Chart */}
      <FinancialChart
        transactions={transactions}
        startDate={dateRange.start}
        endDate={dateRange.end}
        isLoading={transactionsLoading}
      />

      {/* Transaction List */}
      <Card>
        <CardContent className="p-4">
          <TransactionList
            transactions={transactions}
            isLoading={transactionsLoading}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <ExpenseFormModal
        open={expenseModalOpen}
        onOpenChange={handleModalClose}
        categories={categories}
        onManageCategories={() => {
          setExpenseModalOpen(false);
          setCategoryModalOpen(true);
        }}
        editTransaction={editingTransaction}
      />

      <CategoryManagerModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        categories={categories}
      />
    </div>
  );
}
