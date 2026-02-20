import { useState } from "react";
import { Link2, Link2Off, Loader2, Plus, Ban, RotateCcw } from "lucide-react";
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
  useProductAddonExclusions,
  useExcludeAddonFromProduct,
  useRestoreAddonToProduct,
} from "@/hooks/useProductAddonGroups";
import { usePublicAddonsForCategory } from "@/hooks/usePublicAddons";
import { AddonGroupForm } from "./AddonGroupForm";
import type { AddonGroupFormData } from "@/hooks/useAddons";

interface ProductAddonLinkManagerProps {
  productId: string;
  establishmentId: string;
  categoryId?: string | null;
}

export function ProductAddonLinkManager({
  productId,
  establishmentId,
  categoryId,
}: ProductAddonLinkManagerProps) {
  const { data: globalGroups = [], isLoading: isLoadingGroups } =
    useGlobalAddonGroups(establishmentId);

  const { data: linkedGroupIds = [], isLoading: isLoadingLinks } =
    useProductAddonLinks(productId);

  const { data: excludedGroupIds = [], isLoading: isLoadingExclusions } =
    useProductAddonExclusions(productId);

  // Fetch category-level groups (for display in the "Da Categoria" section)
  const { data: categoryAddonsData, isLoading: isLoadingCategory } =
    usePublicAddonsForCategory(categoryId ?? undefined);

  const linkMutation = useLinkAddonGroupToProduct();
  const unlinkMutation = useUnlinkAddonGroupFromProduct();
  const excludeMutation = useExcludeAddonFromProduct();
  const restoreMutation = useRestoreAddonToProduct();
  const createGroup = useCreateGlobalAddonGroup(establishmentId);

  const [formOpen, setFormOpen] = useState(false);

  const isLoading =
    isLoadingGroups || isLoadingLinks || isLoadingExclusions || isLoadingCategory;

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

  const handleCreateAndLink = async (data: AddonGroupFormData) => {
    const result = await createGroup.mutateAsync(data);
    if (result?.id) {
      await linkMutation.mutateAsync({ productId, addonGroupId: result.id });
    }
    setFormOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando adicionais...
      </div>
    );
  }

  // Groups from category (fetched via usePublicAddonsForCategory)
  const categoryGroups = categoryAddonsData?.groups ?? [];

  // Product-exclusive groups (linked directly via product_addon_groups)
  // Exclude those that are also category groups (to avoid duplicate display)
  const categoryGroupIds = new Set(categoryGroups.map((g) => g.id));
  const exclusiveGroups = globalGroups.filter(
    (g) => linkedGroupIds.includes(g.id) && !categoryGroupIds.has(g.id)
  );

  // Available groups: global groups not linked as exclusive and not from category
  const availableGroups = globalGroups.filter(
    (g) => !linkedGroupIds.includes(g.id) && !categoryGroupIds.has(g.id)
  );

  const totalActive =
    categoryGroups.filter((g) => !excludedGroupIds.includes(g.id)).length +
    exclusiveGroups.length;

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

      {/* ── SEÇÃO 1: Da Categoria ────────────────────────────────────────── */}
      {categoryGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Da Categoria (herdados)
          </p>
          {categoryGroups.map((group) => {
            const isExcluded = excludedGroupIds.includes(group.id);
            return (
              <div
                key={group.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                  isExcluded
                    ? "bg-muted/40 border-border/50 opacity-60"
                    : "bg-card border-border"
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isExcluded ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {group.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.min_selections}-{group.max_selections} seleções
                      {group.required && " • Obrigatório"}
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
                  onClick={() => handleToggleCategoryExclusion(group.id)}
                  disabled={isMutating}
                  className={`shrink-0 ${
                    isExcluded
                      ? "text-foreground"
                      : "text-destructive hover:text-destructive"
                  }`}
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
          })}
        </div>
      )}

      {/* ── SEÇÃO 2: Exclusivos do produto ───────────────────────────────── */}
      {exclusiveGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Exclusivos deste produto
          </p>
          {exclusiveGroups.map((group) => (
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
                onClick={() => handleToggleProductGroup(group.id)}
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

      {/* ── SEÇÃO 3: Disponíveis para adicionar ──────────────────────────── */}
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
                <p className="text-sm font-medium truncate text-muted-foreground">
                  {group.name}
                </p>
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

      {/* Empty state */}
      {categoryGroups.length === 0 && globalGroups.length === 0 && (
        <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed rounded-lg">
          <p>Nenhum grupo de adicionais encontrado.</p>
          <p className="text-xs mt-1">
            Clique em "Novo Grupo" para criar o primeiro.
          </p>
        </div>
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
