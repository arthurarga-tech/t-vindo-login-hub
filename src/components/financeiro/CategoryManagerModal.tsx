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
      <DialogContent 
        className="sm:max-w-[500px]"
        data-testid="category-manager-modal"
        aria-labelledby="category-manager-title"
      >
        <DialogHeader>
          <DialogTitle 
            id="category-manager-title"
            data-testid="category-manager-title"
          >
            Gerenciar Categorias
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* New category form */}
          {showNewForm ? (
            <div 
              className="p-4 border rounded-lg space-y-3 bg-muted/50"
              data-testid="category-manager-new-form"
            >
              <div className="space-y-2">
                <Label>Nome da categoria</Label>
                <Input
                  placeholder="Ex: Material de limpeza"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  data-testid="category-manager-new-name-input"
                  aria-label="Nome da nova categoria"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as "income" | "expense")}>
                  <SelectTrigger data-testid="category-manager-new-type-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent data-testid="category-manager-new-type-content">
                    <SelectItem value="expense" data-testid="category-manager-type-expense">Despesa</SelectItem>
                    <SelectItem value="income" data-testid="category-manager-type-income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={createCategory.isPending}
                  data-testid="category-manager-create-button"
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
                  data-testid="category-manager-cancel-new-button"
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
              data-testid="category-manager-show-new-form-button"
              aria-label="Adicionar nova categoria"
            >
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          )}

          <ScrollArea className="h-[350px]" data-testid="category-manager-list">
            <div className="space-y-4">
              {/* Expense categories */}
              <div data-testid="category-manager-expense-section">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  <h3 className="font-medium text-sm" data-testid="category-manager-expense-title">Despesas</h3>
                </div>
                <div className="space-y-1" role="list" aria-label="Lista de categorias de despesas">
                  {expenseCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                      data-testid={`category-manager-expense-item-${cat.id}`}
                      role="listitem"
                    >
                      <span 
                        className={cat.active ? "" : "text-muted-foreground line-through"}
                        data-testid="category-manager-item-name"
                      >
                        {cat.name}
                        {cat.is_default && (
                          <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
                        )}
                      </span>
                      <Switch
                        checked={cat.active}
                        onCheckedChange={() => handleToggleActive(cat)}
                        disabled={updateCategory.isPending}
                        data-testid={`category-manager-toggle-${cat.id}`}
                        aria-label={`${cat.active ? "Desativar" : "Ativar"} categoria ${cat.name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Income categories */}
              <div data-testid="category-manager-income-section">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  <h3 className="font-medium text-sm" data-testid="category-manager-income-title">Receitas</h3>
                </div>
                <div className="space-y-1" role="list" aria-label="Lista de categorias de receitas">
                  {incomeCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                      data-testid={`category-manager-income-item-${cat.id}`}
                      role="listitem"
                    >
                      <span 
                        className={cat.active ? "" : "text-muted-foreground line-through"}
                        data-testid="category-manager-item-name"
                      >
                        {cat.name}
                        {cat.is_default && (
                          <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
                        )}
                      </span>
                      <Switch
                        checked={cat.active}
                        onCheckedChange={() => handleToggleActive(cat)}
                        disabled={updateCategory.isPending}
                        data-testid={`category-manager-toggle-${cat.id}`}
                        aria-label={`${cat.active ? "Desativar" : "Ativar"} categoria ${cat.name}`}
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
