import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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

  const handleToggleActive = async (addon: Addon) => {
    await updateAddon.mutateAsync({
      id: addon.id,
      data: { active: !addon.active },
    });
  };

  if (isLoading) {
    return (
      <div 
        className="text-sm text-muted-foreground"
        data-testid="addon-list-loading"
        role="status"
        aria-label="Carregando adicionais"
      >
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
        <p 
          className="text-xs text-muted-foreground text-center py-2"
          data-testid="addon-list-empty"
          role="status"
        >
          Nenhum adicional cadastrado
        </p>
      ) : (
        <TooltipProvider delayDuration={300}>
          <div className="space-y-1" role="list" aria-label="Lista de adicionais">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className={`flex items-center justify-between py-2 px-3 rounded-md transition-opacity ${
                  addon.active 
                    ? "bg-muted/50" 
                    : "bg-muted/30 opacity-60"
                }`}
                data-testid={`addon-item-${addon.id}`}
                role="listitem"
              >
                <div className="flex items-center gap-2">
                  <span 
                    className={`text-sm ${!addon.active ? "text-muted-foreground" : ""}`}
                    data-testid={`addon-name-${addon.id}`}
                  >
                    {addon.name}
                  </span>
                  {!addon.active && (
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      data-testid={`addon-inactive-badge-${addon.id}`}
                    >
                      Inativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                        className="h-6 w-6 hover:bg-muted"
                        onClick={() => handleToggleActive(addon)}
                        data-testid={`addon-toggle-button-${addon.id}`}
                        aria-label={addon.active ? `Ocultar adicional ${addon.name}` : `Mostrar adicional ${addon.name}`}
                      >
                        {addon.active ? (
                          <Eye className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-3 w-3" aria-hidden="true" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{addon.active ? "Ocultar adicional" : "Mostrar adicional"}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleEdit(addon)}
                        data-testid={`addon-edit-button-${addon.id}`}
                        aria-label={`Editar adicional ${addon.name}`}
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Editar adicional</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-destructive/10 text-destructive"
                        onClick={() => handleDeleteClick(addon)}
                        data-testid={`addon-delete-button-${addon.id}`}
                        aria-label={`Excluir adicional ${addon.name}`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Excluir adicional</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
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
            <AlertDialogTitle data-testid="addon-delete-dialog-title">Excluir adicional?</AlertDialogTitle>
            <AlertDialogDescription data-testid="addon-delete-dialog-description">
              Esta ação irá excluir o adicional "{addonToDelete?.name}".
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="addon-delete-cancel-button">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              data-testid="addon-delete-confirm-button"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
