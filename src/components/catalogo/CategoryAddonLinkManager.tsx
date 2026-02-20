import { useState } from "react";
import { Link2, Link2Off, Loader2, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGlobalAddonGroups,
  useCategoryAddonLinks,
  useLinkAddonGroupToCategory,
  useUnlinkAddonGroupFromCategory,
  useCreateGlobalAddonGroup,
  useReorderAddonGroups,
} from "@/hooks/useGlobalAddonGroups";
import { AddonGroupForm } from "./AddonGroupForm";
import type { AddonGroup, AddonGroupFormData } from "@/hooks/useAddons";
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

interface CategoryAddonLinkManagerProps {
  categoryId: string;
  establishmentId: string;
}

interface SortableLinkedGroupRowProps {
  group: AddonGroup;
  isMutating: boolean;
  onToggle: (id: string) => void;
}

function SortableLinkedGroupRow({ group, isMutating, onToggle }: SortableLinkedGroupRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border bg-card",
        isDragging && "opacity-40 shadow-md z-50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{group.name}</p>
          <p className="text-xs text-muted-foreground">
            {group.min_selections}-{group.max_selections} seleções
            {group.required && " • Obrigatório"}
            {!group.active && " • Inativo"}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onToggle(group.id)}
        disabled={isMutating}
        className="shrink-0 text-destructive hover:text-destructive"
      >
        <Link2Off className="h-3.5 w-3.5 mr-1" />
        Remover
      </Button>
    </div>
  );
}

export function CategoryAddonLinkManager({
  categoryId,
  establishmentId,
}: CategoryAddonLinkManagerProps) {
  const { data: globalGroups = [], isLoading: isLoadingGroups } =
    useGlobalAddonGroups(establishmentId);
  const { data: linkedGroupIds = [], isLoading: isLoadingLinks } =
    useCategoryAddonLinks(categoryId);
  const linkMutation = useLinkAddonGroupToCategory();
  const unlinkMutation = useUnlinkAddonGroupFromCategory();
  const createGroup = useCreateGlobalAddonGroup(establishmentId);
  const reorderGroups = useReorderAddonGroups(establishmentId);

  const [formOpen, setFormOpen] = useState(false);
  const sensors = useDndSensors();

  const isLoading = isLoadingGroups || isLoadingLinks;

  const handleToggle = (addonGroupId: string) => {
    const isLinked = linkedGroupIds.includes(addonGroupId);
    if (isLinked) {
      unlinkMutation.mutate({ categoryId, addonGroupId });
    } else {
      linkMutation.mutate({ categoryId, addonGroupId });
    }
  };

  const handleCreateAndLink = async (data: AddonGroupFormData) => {
    const result = await createGroup.mutateAsync(data);
    if (result?.id) {
      await linkMutation.mutateAsync({ categoryId, addonGroupId: result.id });
    }
    setFormOpen(false);
  };

  const isMutating =
    linkMutation.isPending || unlinkMutation.isPending || createGroup.isPending;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = linkedGroups.findIndex((g) => g.id === active.id);
      const newIndex = linkedGroups.findIndex((g) => g.id === over.id);
      const reordered = arrayMove(linkedGroups, oldIndex, newIndex);
      await reorderGroups.mutateAsync(
        reordered.map((g, i) => ({ id: g.id, order_position: i }))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando adicionais...
      </div>
    );
  }

  const linkedGroups = globalGroups.filter((g) => linkedGroupIds.includes(g.id));
  const availableGroups = globalGroups.filter((g) => !linkedGroupIds.includes(g.id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Adicionais da Categoria</span>
          {linkedGroupIds.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {linkedGroupIds.length} grupo{linkedGroupIds.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Grupo
        </Button>
      </div>

      {/* Linked groups — draggable */}
      {linkedGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Vinculados
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={linkedGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {linkedGroups.map((group) => (
                  <SortableLinkedGroupRow
                    key={group.id}
                    group={group}
                    isMutating={isMutating}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Available groups — static */}
      {availableGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Disponíveis para adicionar
          </p>
          {availableGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed bg-muted/30"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-muted-foreground">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.min_selections}-{group.max_selections} seleções
                  {group.required && " • Obrigatório"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggle(group.id)}
                disabled={isMutating}
                className="shrink-0"
              >
                <Link2 className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {globalGroups.length === 0 && (
        <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed rounded-lg">
          <p>Nenhum grupo de adicionais criado.</p>
          <p className="text-xs mt-1">Clique em "Novo Grupo" para criar o primeiro.</p>
        </div>
      )}

      {linkedGroups.length === 0 && availableGroups.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Nenhum adicional vinculado a esta categoria ainda.
        </p>
      )}

      <AddonGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateAndLink}
        isLoading={createGroup.isPending || linkMutation.isPending}
      />
    </div>
  );
}
