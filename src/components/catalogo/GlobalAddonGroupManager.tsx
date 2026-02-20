import { useState } from "react";
import { Plus, Settings2, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  useGlobalAddonGroups,
  useCreateGlobalAddonGroup,
  useUpdateGlobalAddonGroup,
  useDeleteGlobalAddonGroup,
  useGroupCategoryLinks,
  useReorderAddonGroups,
} from "@/hooks/useGlobalAddonGroups";
import { AddonGroupForm } from "./AddonGroupForm";
import { AddonList } from "./AddonList";
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

interface GlobalAddonGroupManagerProps {
  establishmentId: string;
}

function GroupCategoryBadges({ addonGroupId }: { addonGroupId: string }) {
  const { data: links = [] } = useGroupCategoryLinks(addonGroupId);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {links.map((link) => (
        <Badge key={link.category_id} variant="secondary" className="text-xs">
          {link.categories?.name ?? "Categoria"}
        </Badge>
      ))}
    </div>
  );
}

interface SortableGroupCardProps {
  group: AddonGroup;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (group: AddonGroup) => void;
  onDeleteClick: (group: AddonGroup) => void;
}

function SortableGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDeleteClick,
}: SortableGroupCardProps) {
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
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40 z-50")}>
      <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(group.id)}>
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-start justify-between gap-2">
              {/* Drag handle */}
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none mt-0.5 text-muted-foreground shrink-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="Arrastar para reordenar"
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent flex-1 text-left"
                >
                  <div className="flex items-start gap-2 w-full">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <CardTitle className="text-sm">{group.name}</CardTitle>
                      <GroupCategoryBadges addonGroupId={group.id} />
                    </div>
                  </div>
                </Button>
              </CollapsibleTrigger>

              <div className="flex items-center gap-1 shrink-0">
                {group.required && (
                  <Badge variant="secondary" className="text-xs">
                    Obrigatório
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {group.min_selections}-{group.max_selections}
                </Badge>
                {!group.active && (
                  <Badge variant="destructive" className="text-xs">
                    Inativo
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEdit(group)}
                  aria-label={`Editar grupo ${group.name}`}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => onDeleteClick(group)}
                  aria-label={`Excluir grupo ${group.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              <AddonList addonGroupId={group.id} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

export function GlobalAddonGroupManager({ establishmentId }: GlobalAddonGroupManagerProps) {
  const { data: groups = [], isLoading } = useGlobalAddonGroups(establishmentId);
  const createGroup = useCreateGlobalAddonGroup(establishmentId);
  const updateGroup = useUpdateGlobalAddonGroup(establishmentId);
  const deleteGroup = useDeleteGlobalAddonGroup(establishmentId);
  const reorderGroups = useReorderAddonGroups(establishmentId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<AddonGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const sensors = useDndSensors();

  const handleCreate = () => {
    setEditingGroup(undefined);
    setFormOpen(true);
  };

  const handleEdit = (group: AddonGroup) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleSubmit = async (data: AddonGroupFormData) => {
    if (editingGroup) {
      await updateGroup.mutateAsync({ id: editingGroup.id, data });
    } else {
      await createGroup.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingGroup(undefined);
  };

  const handleDeleteClick = (group: AddonGroup) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (groupToDelete) {
      await deleteGroup.mutateAsync(groupToDelete.id);
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      const reordered = arrayMove(groups, oldIndex, newIndex);
      await reorderGroups.mutateAsync(
        reordered.map((g, i) => ({ id: g.id, order_position: i }))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Carregando adicionais...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Grupos de Adicionais</h3>
        <Button size="sm" variant="outline" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
          <p>Nenhum grupo de adicionais criado ainda</p>
          <p className="text-xs mt-1">Crie grupos reutilizáveis para compartilhar entre categorias</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {groups.map((group) => (
                <SortableGroupCard
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroups.has(group.id)}
                  onToggleExpand={toggleExpanded}
                  onEdit={handleEdit}
                  onDeleteClick={handleDeleteClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddonGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editingGroup}
        onSubmit={handleSubmit}
        isLoading={createGroup.isPending || updateGroup.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo de adicionais?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir o grupo "{groupToDelete?.name}" e todos os seus adicionais,
              removendo-o também de todas as categorias vinculadas. Esta ação não pode ser desfeita.
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
