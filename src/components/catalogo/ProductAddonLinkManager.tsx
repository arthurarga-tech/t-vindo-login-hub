import { useState } from "react";
import { Link2, Link2Off, Loader2, Plus, Ban, RotateCcw, GripVertical, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGlobalAddonGroups,
  useCreateGlobalAddonGroup,
  useCategoryAddonLinks,
  useReorderAddonGroups,
} from "@/hooks/useGlobalAddonGroups";
import {
  useProductAddonLinks,
  useLinkAddonGroupToProduct,
  useUnlinkAddonGroupFromProduct,
  useProductAddonExclusions,
  useExcludeAddonFromProduct,
  useRestoreAddonToProduct,
} from "@/hooks/useProductAddonGroups";
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
import { toast } from "sonner";

interface ProductAddonLinkManagerProps {
  productId: string;
  establishmentId: string;
  categoryId?: string | null;
}

// ── Sortable row for category-inherited groups ────────────────────────────────
interface SortableCategoryGroupRowProps {
  group: AddonGroup;
  isExcluded: boolean;
  isMutating: boolean;
  onToggleExclusion: (id: string) => void;
}

function SortableCategoryGroupRow({
  group,
  isExcluded,
  isMutating,
  onToggleExclusion,
}: SortableCategoryGroupRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `cat-${group.id}`,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors",
        isExcluded ? "bg-muted/40 border-border/50 opacity-60" : "bg-card border-border",
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
          <p
            className={cn(
              "text-sm font-medium truncate",
              isExcluded && "line-through text-muted-foreground"
            )}
          >
            {group.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {group.min_selections}-{group.max_selections} seleções
            {group.required && " • Obrigatório"}
            {!group.active && " • Inativo"}
          </p>
        </div>
        {isExcluded && (
          <Badge variant="outline" className="text-xs shrink-0 text-destructive border-destructive/40">
            Excluído
          </Badge>
        )}
      </div>
      <Button
        size="sm"
        variant={isExcluded ? "outline" : "ghost"}
        onClick={() => onToggleExclusion(group.id)}
        disabled={isMutating}
        className={cn(
          "shrink-0",
          isExcluded ? "text-foreground" : "text-destructive hover:text-destructive"
        )}
      >
        {isExcluded ? (
          <>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restaurar
          </>
        ) : (
          <>
            <Ban className="h-3.5 w-3.5 mr-1" />
            Excluir
          </>
        )}
      </Button>
    </div>
  );
}

// ── Sortable row for product-exclusive groups ─────────────────────────────────
interface SortableExclusiveGroupRowProps {
  group: AddonGroup;
  isMutating: boolean;
  onToggle: (id: string) => void;
}

function SortableExclusiveGroupRow({ group, isMutating, onToggle }: SortableExclusiveGroupRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `exc-${group.id}`,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

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

// ── Main component ────────────────────────────────────────────────────────────
export function ProductAddonLinkManager({
  productId,
  establishmentId,
  categoryId,
}: ProductAddonLinkManagerProps) {
  // Bug 3 fix: use globalGroups (includes inactive) + categoryAddonLinks IDs
  // instead of usePublicAddonsForCategory (which filters active-only).
  const { data: globalGroups = [], isLoading: isLoadingGroups } =
    useGlobalAddonGroups(establishmentId);
  const { data: categoryLinkedIds = [], isLoading: isLoadingCategoryLinks } =
    useCategoryAddonLinks(categoryId ?? undefined);
  const { data: linkedGroupIds = [], isLoading: isLoadingLinks } =
    useProductAddonLinks(productId);
  const { data: excludedGroupIds = [], isLoading: isLoadingExclusions } =
    useProductAddonExclusions(productId);

  const linkMutation = useLinkAddonGroupToProduct();
  const unlinkMutation = useUnlinkAddonGroupFromProduct();
  const excludeMutation = useExcludeAddonFromProduct();
  const restoreMutation = useRestoreAddonToProduct();
  const createGroup = useCreateGlobalAddonGroup(establishmentId);
  const reorderGroups = useReorderAddonGroups(establishmentId);

  const [formOpen, setFormOpen] = useState(false);

  // Bug 1 fix: single sensor instance for one unified DndContext
  const sensors = useDndSensors();

  const isLoading =
    isLoadingGroups || isLoadingLinks || isLoadingExclusions || isLoadingCategoryLinks;

  const isMutating =
    linkMutation.isPending ||
    unlinkMutation.isPending ||
    excludeMutation.isPending ||
    restoreMutation.isPending ||
    createGroup.isPending;

  const handleToggleProductGroup = (addonGroupId: string) => {
    const isLinked = linkedGroupIds.includes(addonGroupId);
    if (isLinked) {
      unlinkMutation.mutate({ productId, addonGroupId });
    } else {
      linkMutation.mutate({ productId, addonGroupId });
    }
  };

  const handleToggleCategoryExclusion = (addonGroupId: string) => {
    const isExcluded = excludedGroupIds.includes(addonGroupId);
    if (isExcluded) {
      restoreMutation.mutate({ productId, addonGroupId });
    } else {
      excludeMutation.mutate({ productId, addonGroupId });
    }
  };

  // Bug 6 fix: wrap in try/catch so form doesn't close on error
  const handleCreateAndLink = async (data: AddonGroupFormData) => {
    try {
      const result = await createGroup.mutateAsync(data);
      if (result?.id) {
        await linkMutation.mutateAsync({ productId, addonGroupId: result.id });
      }
      setFormOpen(false);
    } catch {
      toast.error("Erro ao criar e vincular grupo. Tente novamente.");
      // Do NOT close the form — let user retry
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

  // Bug 3 fix: derive category groups from globalGroups (includes inactive) + categoryLinkedIds
  const categoryGroupIds = new Set(categoryLinkedIds);
  const categoryGroups = globalGroups.filter((g) => categoryGroupIds.has(g.id));

  const exclusiveGroups = globalGroups.filter(
    (g) => linkedGroupIds.includes(g.id) && !categoryGroupIds.has(g.id)
  );
  const availableGroups = globalGroups.filter(
    (g) => !linkedGroupIds.includes(g.id) && !categoryGroupIds.has(g.id)
  );

  const totalActive =
    categoryGroups.filter((g) => !excludedGroupIds.includes(g.id)).length + exclusiveGroups.length;

  // Bug 1 fix: unified DndContext with prefixed IDs to avoid conflicts
  const allSortableIds = [
    ...categoryGroups.map((g) => `cat-${g.id}`),
    ...exclusiveGroups.map((g) => `exc-${g.id}`),
  ];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Determine which section the drag occurred in
    if (activeId.startsWith("cat-") && overId.startsWith("cat-")) {
      const oldIndex = categoryGroups.findIndex((g) => `cat-${g.id}` === activeId);
      const newIndex = categoryGroups.findIndex((g) => `cat-${g.id}` === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(categoryGroups, oldIndex, newIndex);
        await reorderGroups.mutateAsync(
          reordered.map((g, i) => ({ id: g.id, order_position: i }))
        );
      }
    } else if (activeId.startsWith("exc-") && overId.startsWith("exc-")) {
      const oldIndex = exclusiveGroups.findIndex((g) => `exc-${g.id}` === activeId);
      const newIndex = exclusiveGroups.findIndex((g) => `exc-${g.id}` === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(exclusiveGroups, oldIndex, newIndex);
        await reorderGroups.mutateAsync(
          reordered.map((g, i) => ({ id: g.id, order_position: i }))
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Adicionais do Produto</span>
          {totalActive > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalActive} ativo{totalActive !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Grupo
        </Button>
      </div>

      {/* Bug 1 fix: Single unified DndContext for both sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* ── SEÇÃO 1: Da Categoria ──────────────────────────── */}
        {categoryId ? (
          categoryGroups.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Da Categoria (herdados)
              </p>
              <SortableContext
                items={categoryGroups.map((g) => `cat-${g.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categoryGroups.map((group) => (
                    <SortableCategoryGroupRow
                      key={group.id}
                      group={group}
                      isExcluded={excludedGroupIds.includes(group.id)}
                      isMutating={isMutating}
                      onToggleExclusion={handleToggleCategoryExclusion}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-2 px-3 rounded-lg border border-dashed bg-muted/20">
              Nenhum adicional herdado da categoria.
            </div>
          )
        ) : (
          // Melhoria 4: empty state when product has no category
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3 px-3 rounded-lg border border-dashed bg-muted/20">
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span>Associe este produto a uma categoria para ver os adicionais herdados.</span>
          </div>
        )}

        {/* ── SEÇÃO 2: Exclusivos do produto ────────────────── */}
        {exclusiveGroups.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Exclusivos deste produto
            </p>
            <SortableContext
              items={exclusiveGroups.map((g) => `exc-${g.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {exclusiveGroups.map((group) => (
                  <SortableExclusiveGroupRow
                    key={group.id}
                    group={group}
                    isMutating={isMutating}
                    onToggle={handleToggleProductGroup}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        )}
      </DndContext>

      {/* ── SEÇÃO 3: Disponíveis para adicionar ───────────── */}
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
                onClick={() => handleToggleProductGroup(group.id)}
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

      {/* Empty state — no global groups at all */}
      {globalGroups.length === 0 && (
        <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed rounded-lg">
          <p>Nenhum grupo de adicionais encontrado.</p>
          <p className="text-xs mt-1">Clique em "Novo Grupo" para criar o primeiro.</p>
        </div>
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
