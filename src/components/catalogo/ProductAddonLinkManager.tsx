import { useState } from "react";
import { Link2, Link2Off, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGlobalAddonGroups,
  useCreateGlobalAddonGroup,
} from "@/hooks/useGlobalAddonGroups";
import {
  useProductAddonLinks,
  useLinkAddonGroupToProduct,
  useUnlinkAddonGroupFromProduct,
} from "@/hooks/useProductAddonGroups";
import { AddonGroupForm } from "./AddonGroupForm";
import type { AddonGroupFormData } from "@/hooks/useAddons";

interface ProductAddonLinkManagerProps {
  productId: string;
  establishmentId: string;
}

export function ProductAddonLinkManager({
  productId,
  establishmentId,
}: ProductAddonLinkManagerProps) {
  const { data: globalGroups = [], isLoading: isLoadingGroups } =
    useGlobalAddonGroups(establishmentId);
  const { data: linkedGroupIds = [], isLoading: isLoadingLinks } =
    useProductAddonLinks(productId);
  const linkMutation = useLinkAddonGroupToProduct();
  const unlinkMutation = useUnlinkAddonGroupFromProduct();
  const createGroup = useCreateGlobalAddonGroup(establishmentId);

  const [formOpen, setFormOpen] = useState(false);

  const isLoading = isLoadingGroups || isLoadingLinks;

  const handleToggle = (addonGroupId: string) => {
    const isLinked = linkedGroupIds.includes(addonGroupId);
    if (isLinked) {
      unlinkMutation.mutate({ productId, addonGroupId });
    } else {
      linkMutation.mutate({ productId, addonGroupId });
    }
  };

  const handleCreateAndLink = async (data: AddonGroupFormData) => {
    const result = await createGroup.mutateAsync(data);
    if (result?.id) {
      await linkMutation.mutateAsync({ productId, addonGroupId: result.id });
    }
    setFormOpen(false);
  };

  const isMutating =
    linkMutation.isPending || unlinkMutation.isPending || createGroup.isPending;

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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Adicionais do Produto</span>
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

      {/* Linked groups */}
      {linkedGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Vinculados
          </p>
          {linkedGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.min_selections}-{group.max_selections} seleções
                  {group.required && " • Obrigatório"}
                  {!group.active && " • Inativo"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggle(group.id)}
                disabled={isMutating}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                <Link2Off className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Available groups */}
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
          <p className="text-xs mt-1">
            Clique em "Novo Grupo" para criar o primeiro.
          </p>
        </div>
      )}

      {linkedGroups.length === 0 && availableGroups.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Nenhum adicional vinculado a este produto ainda.
        </p>
      )}

      {/* Form to create new global group and auto-link */}
      <AddonGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateAndLink}
        isLoading={createGroup.isPending || linkMutation.isPending}
      />
    </div>
  );
}
