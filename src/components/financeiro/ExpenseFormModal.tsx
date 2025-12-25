import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FinancialCategory, FinancialTransaction, useCreateTransaction, useUpdateTransaction } from "@/hooks/useFinancial";
import { toast } from "sonner";

interface ExpenseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: FinancialCategory[];
  onManageCategories: () => void;
  editTransaction?: FinancialTransaction | null;
}

export function ExpenseFormModal({ 
  open, 
  onOpenChange, 
  categories, 
  onManageCategories,
  editTransaction 
}: ExpenseFormModalProps) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  const isEditing = !!editTransaction;
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Populate form when editing
  useEffect(() => {
    if (editTransaction) {
      setCategoryId(editTransaction.category_id);
      setAmount(editTransaction.gross_amount.toString().replace(".", ","));
      setDescription(editTransaction.description);
      setDate(new Date(editTransaction.transaction_date));
    } else {
      resetForm();
    }
  }, [editTransaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId || !amount || !description) {
      toast.error("Preencha todos os campos");
      return;
    }

    const amountValue = parseFloat(amount.replace(",", "."));
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      if (isEditing) {
        await updateTransaction.mutateAsync({
          id: editTransaction.id,
          category_id: categoryId,
          gross_amount: amountValue,
          description,
          transaction_date: date,
        });
        toast.success("Lançamento atualizado com sucesso!");
      } else {
        await createTransaction.mutateAsync({
          category_id: categoryId,
          type: "expense",
          gross_amount: amountValue,
          description,
          transaction_date: date,
        });
        toast.success("Despesa lançada com sucesso!");
      }

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const resetForm = () => {
    setCategoryId("");
    setAmount("");
    setDescription("");
    setDate(new Date());
  };

  const isPending = createTransaction.isPending || updateTransaction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Lançamento" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Categoria</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={onManageCategories}
              >
                <Settings className="h-3 w-3 mr-1" />
                Gerenciar
              </Button>
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="text"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Compra de botijão de gás"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}