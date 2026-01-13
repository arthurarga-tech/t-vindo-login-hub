import { useState } from "react";
import { Edit2, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CategoryListProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelect: (category: Category) => void;
  onEdit: (category: Category) => void;
  establishmentId: string;
}

interface SortableCategoryItemProps {
  category: Category;
  isSelected: boolean;
  onSelect: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (category: Category) => void;
}

function SortableCategoryItem({
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
      onClick={() => onSelect(category)}
      data-testid={`category-item-${category.id}`}
      role="listitem"
      aria-selected={isSelected}
      aria-label={`Categoria ${category.name}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
        data-testid={`category-item-${category.id}-drag-handle`}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      {category.image_url ? (
        <img
          src={category.image_url}
          alt={category.name}
          className="w-8 h-8 rounded object-cover"
          data-testid={`category-item-${category.id}-image`}
        />
      ) : (
        <div 
          className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-medium"
          data-testid={`category-item-${category.id}-placeholder`}
        >
          {category.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p 
          className={cn(
            "text-sm font-medium truncate",
            !category.active && "text-muted-foreground"
          )}
          data-testid={`category-item-${category.id}-name`}
        >
          {category.name}
        </p>
      </div>

      {!category.active && (
        <Badge 
          variant="secondary" 
          className="text-xs"
          data-testid={`category-item-${category.id}-inactive-badge`}
        >
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
            onToggleActive(category);
          }}
          data-testid={`category-item-${category.id}-toggle-active-button`}
          aria-label={category.active ? "Ocultar categoria" : "Mostrar categoria"}
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
          data-testid={`category-item-${category.id}-edit-button`}
          aria-label="Editar categoria"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(category.id);
          }}
          data-testid={`category-item-${category.id}-delete-button`}
          aria-label="Excluir categoria"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      
      await reorderCategories.mutateAsync(
        newCategories.map((c, i) => ({ id: c.id, order_position: i }))
      );
    }
  };

  const categoryToDelete = categories.find((c) => c.id === deleteId);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div 
            className="space-y-1"
            data-testid="category-list"
            role="list"
            aria-label="Lista de categorias"
          >
            {categories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                isSelected={selectedCategory?.id === category.id}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={setDeleteId}
                onToggleActive={handleToggleActive}
              />
            ))}

            {categories.length === 0 && (
              <p 
                className="text-sm text-muted-foreground text-center py-8"
                data-testid="category-list-empty"
                role="status"
              >
                Nenhuma categoria cadastrada
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="category-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="category-delete-dialog-title">
              Excluir categoria?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="category-delete-dialog-description">
              A categoria "{categoryToDelete?.name}" será excluída permanentemente.
              Os produtos desta categoria ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="category-delete-dialog-cancel">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="category-delete-dialog-confirm"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
