import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAddons,
  useCreateAddon,
  useUpdateAddon,
  useDeleteAddon,
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

interface AddonListProps {
  addonGroupId: string;
}

export function AddonList({ addonGroupId }: AddonListProps) {
  const { data: addons = [], isLoading } = useAddons(addonGroupId);
  const createAddon = useCreateAddon(addonGroupId);
  const updateAddon = useUpdateAddon(addonGroupId);
  const deleteAddon = useDeleteAddon(addonGroupId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState<Addon | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

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

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {addons.length} {addons.length === 1 ? "adicional" : "adicionais"}
        </span>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCreate}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>

      {addons.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum adicional cadastrado
        </p>
      ) : (
        <div className="space-y-1">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{addon.name}</span>
                {!addon.active && (
                  <Badge variant="outline" className="text-xs">
                    Inativo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  +{formatPrice(addon.price)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleEdit(addon)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => handleDeleteClick(addon)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddonForm
        open={formOpen}
        onOpenChange={setFormOpen}
        addon={editingAddon}
        onSubmit={handleSubmit}
        isLoading={createAddon.isPending || updateAddon.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir adicional?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir o adicional "{addonToDelete?.name}".
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
