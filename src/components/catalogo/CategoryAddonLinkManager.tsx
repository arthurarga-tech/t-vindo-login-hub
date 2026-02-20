import { Link2, Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useGlobalAddonGroups,
  useCategoryAddonLinks,
  useLinkAddonGroupToCategory,
  useUnlinkAddonGroupFromCategory,
} from "@/hooks/useGlobalAddonGroups";

interface CategoryAddonLinkManagerProps {
  categoryId: string;
  establishmentId: string;
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

  const isLoading = isLoadingGroups || isLoadingLinks;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando grupos globais...
      </div>
    );
  }

  if (globalGroups.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
        <p>Nenhum grupo global disponível.</p>
        <p className="text-xs mt-1">
          Crie grupos globais na seção "Adicionais" do catálogo para vinculá-los aqui.
        </p>
      </div>
    );
  }

  const handleToggle = (addonGroupId: string) => {
    const isLinked = linkedGroupIds.includes(addonGroupId);
    if (isLinked) {
      unlinkMutation.mutate({ categoryId, addonGroupId });
    } else {
      linkMutation.mutate({ categoryId, addonGroupId });
    }
  };

  const isMutating = linkMutation.isPending || unlinkMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Grupos Globais Vinculados</span>
        {linkedGroupIds.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {linkedGroupIds.length} vinculado{linkedGroupIds.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {globalGroups.map((group) => {
          const isLinked = linkedGroupIds.includes(group.id);
          return (
            <div
              key={group.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2 min-w-0">
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
                variant={isLinked ? "destructive" : "outline"}
                onClick={() => handleToggle(group.id)}
                disabled={isMutating}
                className="shrink-0"
              >
                {isLinked ? (
                  <>
                    <Link2Off className="h-3.5 w-3.5 mr-1" />
                    Desvincular
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5 mr-1" />
                    Vincular
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
