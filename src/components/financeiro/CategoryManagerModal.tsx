import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { FinancialCategory, useCreateCategory, useUpdateCategory } from "@/hooks/useFinancial";
import { toast } from "sonner";

interface CategoryManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: FinancialCategory[];
}

export function CategoryManagerModal({ open, onOpenChange, categories }: CategoryManagerModalProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    try {
      await createCategory.mutateAsync({
        name: newName.trim(),
        type: newType,
      });
      toast.success("Categoria criada!");
      setNewName("");
      setShowNewForm(false);
    } catch (error: any) {
      toast.error("Erro ao criar categoria: " + error.message);
    }
  };

  const handleToggleActive = async (category: FinancialCategory) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        active: !category.active,
      });
    } catch (error: any) {
      toast.error("Erro ao atualizar categoria: " + error.message);
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* New category form */}
          {showNewForm ? (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
              <div className="space-y-2">
                <Label>Nome da categoria</Label>
                <Input
                  placeholder="Ex: Material de limpeza"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as "income" | "expense")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={createCategory.isPending}
                >
                  {createCategory.isPending ? "Salvando..." : "Criar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          )}

          <ScrollArea className="h-[350px]">
            <div className="space-y-4">
              {/* Expense categories */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  <h3 className="font-medium text-sm">Despesas</h3>
                </div>
                <div className="space-y-1">
                  {expenseCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                    >
                      <span className={cat.active ? "" : "text-muted-foreground line-through"}>
                        {cat.name}
                        {cat.is_default && (
                          <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
                        )}
                      </span>
                      <Switch
                        checked={cat.active}
                        onCheckedChange={() => handleToggleActive(cat)}
                        disabled={updateCategory.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Income categories */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  <h3 className="font-medium text-sm">Receitas</h3>
                </div>
                <div className="space-y-1">
                  {incomeCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                    >
                      <span className={cat.active ? "" : "text-muted-foreground line-through"}>
                        {cat.name}
                        {cat.is_default && (
                          <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
                        )}
                      </span>
                      <Switch
                        checked={cat.active}
                        onCheckedChange={() => handleToggleActive(cat)}
                        disabled={updateCategory.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
