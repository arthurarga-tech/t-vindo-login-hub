import { useState } from "react";
import { Plus, Settings2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useAddonGroups,
  useCreateAddonGroup,
  useUpdateAddonGroup,
  useDeleteAddonGroup,
  AddonGroup,
  AddonGroupFormData,
} from "@/hooks/useAddons";
import { AddonGroupForm } from "./AddonGroupForm";
import { AddonList } from "./AddonList";
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

interface AddonGroupManagerProps {
  categoryId: string;
  establishmentId: string;
}

export function AddonGroupManager({ categoryId, establishmentId }: AddonGroupManagerProps) {
  const { data: groups = [], isLoading } = useAddonGroups(categoryId);
  const createGroup = useCreateAddonGroup(establishmentId, categoryId);
  const updateGroup = useUpdateAddonGroup(categoryId);
  const deleteGroup = useDeleteAddonGroup(categoryId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<AddonGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando adicionais...</div>;
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
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum grupo de adicionais cadastrado
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Collapsible
              key={group.id}
              open={expandedGroups.has(group.id)}
              onOpenChange={() => toggleExpanded(group.id)}
            >
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                        <div className="flex items-center gap-2">
                          {expandedGroups.has(group.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <CardTitle className="text-sm">{group.name}</CardTitle>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
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
                        onClick={() => handleEdit(group)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteClick(group)}
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
          ))}
        </div>
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
              Esta ação irá excluir o grupo "{groupToDelete?.name}" e todos os seus adicionais.
              Esta ação não pode ser desfeita.
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
