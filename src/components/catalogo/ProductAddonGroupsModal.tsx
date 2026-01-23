import { useState } from "react";
import { Plus, Trash2, Link2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAllAddonGroups,
  useProductAddonGroups,
  useLinkAddonGroupToProduct,
  useUnlinkAddonGroupFromProduct,
} from "@/hooks/useAddons";
import { Product } from "@/hooks/useProducts";

interface ProductAddonGroupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductAddonGroupsModal({
  open,
  onOpenChange,
  product,
}: ProductAddonGroupsModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  
  const { data: allGroups, isLoading: loadingAllGroups } = useAllAddonGroups();
  const { data: productGroups, isLoading: loadingProductGroups } = useProductAddonGroups(product?.id);
  const linkMutation = useLinkAddonGroupToProduct();
  const unlinkMutation = useUnlinkAddonGroupFromProduct();

  const linkedGroupIds = new Set(productGroups?.map(pg => pg.addon_group_id) || []);
  const availableGroups = allGroups?.filter(g => !linkedGroupIds.has(g.id)) || [];

  const handleLink = async () => {
    if (!product?.id || !selectedGroupId) return;
    await linkMutation.mutateAsync({ productId: product.id, addonGroupId: selectedGroupId });
    setSelectedGroupId("");
  };

  const handleUnlink = async (addonGroupId: string) => {
    if (!product?.id) return;
    await unlinkMutation.mutateAsync({ productId: product.id, addonGroupId });
  };

  const isLoading = loadingAllGroups || loadingProductGroups;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Adicionais do Produto
          </DialogTitle>
          <DialogDescription>
            Vincule grupos de adicionais existentes ao produto "{product?.name}".
            Os adicionais da categoria do produto já são aplicados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new group link */}
          <div className="flex gap-2">
            <Select
              value={selectedGroupId}
              onValueChange={setSelectedGroupId}
              disabled={isLoading || availableGroups.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={
                  availableGroups.length === 0 
                    ? "Nenhum grupo disponível" 
                    : "Selecione um grupo..."
                } />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                    {group.category?.name && (
                      <span className="text-muted-foreground ml-1">
                        ({group.category.name})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleLink}
              disabled={!selectedGroupId || linkMutation.isPending}
            >
              {linkMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Linked groups list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Grupos vinculados ({productGroups?.length || 0})
            </h4>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : productGroups?.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  <p className="text-sm">
                    Nenhum grupo adicional vinculado.
                  </p>
                  <p className="text-xs mt-1">
                    Os adicionais da categoria do produto ainda se aplicam.
                  </p>
                </CardContent>
              </Card>
            ) : (
              productGroups?.map((pg) => (
                <Card key={pg.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{pg.addon_group?.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {pg.addon_group?.category?.name && (
                          <Badge variant="outline" className="text-xs">
                            {pg.addon_group.category.name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {pg.addon_group?.required ? "Obrigatório" : "Opcional"} •{" "}
                          {pg.addon_group?.min_selections}-{pg.addon_group?.max_selections} seleções
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleUnlink(pg.addon_group_id)}
                      disabled={unlinkMutation.isPending}
                    >
                      {unlinkMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}