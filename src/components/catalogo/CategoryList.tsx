import { useState } from "react";
import { ChevronUp, ChevronDown, Edit2, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Category, useDeleteCategory, useReorderCategories, useUpdateCategory } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

interface CategoryListProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelect: (category: Category) => void;
  onEdit: (category: Category) => void;
  establishmentId: string;
}

export function CategoryList({
  categories,
  selectedCategory,
  onSelect,
  onEdit,
  establishmentId,
}: CategoryListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteCategory = useDeleteCategory(establishmentId);
  const updateCategory = useUpdateCategory(establishmentId);
  const reorderCategories = useReorderCategories(establishmentId);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCategory.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (category: Category) => {
    await updateCategory.mutateAsync({
      id: category.id,
      data: { active: !category.active },
    });
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];
    await reorderCategories.mutateAsync(
      newCategories.map((c, i) => ({ id: c.id, order_position: i }))
    );
  };

  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    await reorderCategories.mutateAsync(
      newCategories.map((c, i) => ({ id: c.id, order_position: i }))
    );
  };

  const categoryToDelete = categories.find((c) => c.id === deleteId);

  return (
    <>
      <div className="space-y-1">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group",
              selectedCategory?.id === category.id
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-muted"
            )}
            onClick={() => onSelect(category)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
            
            {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.name}
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                {category.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                !category.active && "text-muted-foreground"
              )}>
                {category.name}
              </p>
            </div>

            {!category.active && (
              <Badge variant="secondary" className="text-xs">
                Inativa
              </Badge>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveUp(index);
                }}
                disabled={index === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveDown(index);
                }}
                disabled={index === categories.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleActive(category);
                }}
              >
                {category.active ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(category);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(category.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma categoria cadastrada
          </p>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{categoryToDelete?.name}" será excluída permanentemente.
              Os produtos desta categoria ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
