import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAddons,
  useCreateAddon,
  useUpdateAddon,
  useDeleteAddon,
  useReorderAddons,
  Addon,
  AddonFormData,
} from "@/hooks/useAddons";
import { AddonForm } from "./AddonForm";
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
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDndSensors } from "@/hooks/useDndSensors";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/formatters";

interface SortableAddonRowProps {
  addon: Addon;
  onEdit: (addon: Addon) => void;
  onDeleteClick: (addon: Addon) => void;
  onToggleActive: (addon: Addon) => void;
  formatPrice: (price: number) => string;
}

function SortableAddonRow({
  addon,
  onEdit,
  onDeleteClick,
  onToggleActive,
  formatPrice,
}: SortableAddonRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: addon.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-md transition-opacity group",
        addon.active ? "bg-muted/50" : "bg-muted/30 opacity-60",
        isDragging && "opacity-40 shadow-md z-50"
      )}
      role="listitem"
      data-testid={`addon-item-${addon.id}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none mr-2 text-muted-foreground shrink-0"
        onClick={(e) => e.stopPropagation()}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className={cn("text-sm truncate", !addon.active && "text-muted-foreground")}
          data-testid={`addon-name-${addon.id}`}
        >
          {addon.name}
        </span>
        {!addon.active && (
          <Badge variant="outline" className="text-xs shrink-0" data-testid={`addon-inactive-badge-${addon.id}`}>
            Inativo
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-sm font-medium text-primary"
          data-testid={`addon-price-${addon.id}`}
        >
          +{formatPrice(addon.price)}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-muted"
              onClick={() => onToggleActive(addon)}
              data-testid={`addon-toggle-button-${addon.id}`}
              aria-label={addon.active ? `Ocultar ${addon.name}` : `Mostrar ${addon.name}`}
            >
              {addon.active ? (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{addon.active ? "Ocultar" : "Mostrar"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
              onClick={() => onEdit(addon)}
              data-testid={`addon-edit-button-${addon.id}`}
              aria-label={`Editar ${addon.name}`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Editar</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-destructive/10 text-destructive"
              onClick={() => onDeleteClick(addon)}
              data-testid={`addon-delete-button-${addon.id}`}
              aria-label={`Excluir ${addon.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Excluir</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

interface AddonListProps {
  addonGroupId: string;
}

export function AddonList({ addonGroupId }: AddonListProps) {
  const { data: addons = [], isLoading } = useAddons(addonGroupId);
  const createAddon = useCreateAddon(addonGroupId);
  const updateAddon = useUpdateAddon(addonGroupId);
  const deleteAddon = useDeleteAddon(addonGroupId);
  const reorderAddons = useReorderAddons(addonGroupId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState<Addon | null>(null);

  const sensors = useDndSensors();


  const handleCreate = () => {
    setEditingAddon(undefined);
    setFormOpen(true);
  };

  const handleEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setFormOpen(true);
  };

  const handleSubmit = async (data: AddonFormData) => {
    if (editingAddon) {
      await updateAddon.mutateAsync({ id: editingAddon.id, data });
    } else {
      await createAddon.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingAddon(undefined);
  };

  const handleDeleteClick = (addon: Addon) => {
    setAddonToDelete(addon);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (addonToDelete) {
      await deleteAddon.mutateAsync(addonToDelete.id);
      setDeleteDialogOpen(false);
      setAddonToDelete(null);
    }
  };

  const handleToggleActive = async (addon: Addon) => {
    await updateAddon.mutateAsync({ id: addon.id, data: { active: !addon.active } });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = addons.findIndex((a) => a.id === active.id);
      const newIndex = addons.findIndex((a) => a.id === over.id);
      const reordered = arrayMove(addons, oldIndex, newIndex);
      await reorderAddons.mutateAsync(
        reordered.map((a, i) => ({ id: a.id, order_position: i }))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground" role="status">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="addon-list">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground" data-testid="addon-list-count">
          {addons.length} {addons.length === 1 ? "adicional" : "adicionais"}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={handleCreate}
          data-testid="addon-create-button"
          aria-label="Adicionar novo adicional"
        >
          <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      {addons.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2" role="status" data-testid="addon-list-empty">
          Nenhum adicional cadastrado
        </p>
      ) : (
        <TooltipProvider delayDuration={300}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={addons.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1" role="list" aria-label="Lista de adicionais">
                {addons.map((addon) => (
                  <SortableAddonRow
                    key={addon.id}
                    addon={addon}
                    onEdit={handleEdit}
                    onDeleteClick={handleDeleteClick}
                    onToggleActive={handleToggleActive}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TooltipProvider>
      )}

      <AddonForm
        open={formOpen}
        onOpenChange={setFormOpen}
        addon={editingAddon}
        onSubmit={handleSubmit}
        isLoading={createAddon.isPending || updateAddon.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="addon-delete-dialog" role="alertdialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir adicional?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir o adicional "{addonToDelete?.name}". Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
