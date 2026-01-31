import { useState, useEffect, useMemo } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import { useAddonGroups, useAddonsForGroups } from "@/hooks/useAddons";
import { OrderItem } from "@/hooks/useOrders";
import { useUpdateOrderItem, useDeleteOrderItem, OrderItemAddonInput } from "@/hooks/useOrderItemMutations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface OrderItemEditModalProps {
  item: OrderItem | null;
  orderId: string;
  open: boolean;
  onClose: () => void;
}

export function OrderItemEditModal({
  item,
  orderId,
  open,
  onClose,
}: OrderItemEditModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateItem = useUpdateOrderItem();
  const deleteItem = useDeleteOrderItem();

  // Fetch product to get category_id
  const { data: product } = useQuery({
    queryKey: ["product-for-edit", item?.id],
    queryFn: async () => {
      if (!item) return null;
      // Get product_id from order_items table
      const { data: orderItem } = await supabase
        .from("order_items")
        .select("product_id")
        .eq("id", item.id)
        .single();

      if (!orderItem?.product_id) return null;

      const { data } = await supabase
        .from("products")
        .select("id, category_id")
        .eq("id", orderItem.product_id)
        .single();

      return data;
    },
    enabled: !!item && open,
  });

  const { data: addonGroups } = useAddonGroups(product?.category_id ?? undefined);
  const activeGroupIds = useMemo(
    () => addonGroups?.filter((g) => g.active).map((g) => g.id) || [],
    [addonGroups]
  );
  const { data: addons } = useAddonsForGroups(activeGroupIds);
  const activeAddons = useMemo(() => addons?.filter((a) => a.active) || [], [addons]);

  // Initialize state when modal opens
  useEffect(() => {
    if (item && open) {
      setQuantity(item.quantity);
      setObservation(item.observation || "");
      const addonsMap = new Map<string, number>();
      item.addons?.forEach((addon) => {
        // Try to find addon by name if id doesn't match available addons
        const matchingAddon = activeAddons.find(
          (a) => a.id === addon.id || a.name === addon.addon_name
        );
        if (matchingAddon) {
          addonsMap.set(matchingAddon.id, addon.quantity);
        }
      });
      setSelectedAddons(addonsMap);
    }
  }, [item, open, activeAddons]);

  const handleAddonToggle = (addonId: string, checked: boolean) => {
    const newMap = new Map(selectedAddons);
    if (checked) {
      newMap.set(addonId, 1);
    } else {
      newMap.delete(addonId);
    }
    setSelectedAddons(newMap);
  };

  const handleAddonQuantityChange = (addonId: string, delta: number) => {
    const newMap = new Map(selectedAddons);
    const currentQty = newMap.get(addonId) || 0;
    const newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) {
      newMap.delete(addonId);
    } else {
      newMap.set(addonId, newQty);
    }
    setSelectedAddons(newMap);
  };

  const calculateTotal = () => {
    if (!item) return 0;
    let total = item.product_price * quantity;
    selectedAddons.forEach((qty, addonId) => {
      const addon = activeAddons.find((a) => a.id === addonId);
      if (addon) {
        total += addon.price * qty * quantity;
      }
    });
    return total;
  };

  const handleSave = async () => {
    if (!item) return;

    const addonsData: OrderItemAddonInput[] = Array.from(selectedAddons.entries())
      .map(([addonId, qty]) => {
        const addon = activeAddons.find((a) => a.id === addonId);
        if (addon && qty > 0) {
          return {
            addon_id: addon.id,
            addon_name: addon.name,
            addon_price: addon.price,
            quantity: qty,
          };
        }
        return null;
      })
      .filter((a): a is OrderItemAddonInput => a !== null);

    try {
      await updateItem.mutateAsync({
        orderItemId: item.id,
        orderId,
        quantity,
        observation: observation.trim() || undefined,
        addons: addonsData,
        productPrice: item.product_price,
      });
      toast.success("Item atualizado com sucesso");
      onClose();
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    try {
      await deleteItem.mutateAsync({
        orderItemId: item.id,
        orderId,
      });
      toast.success("Item removido do pedido");
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      toast.error("Erro ao remover item");
    }
  };

  // Group addons by their group
  const addonsByGroup = useMemo(() => {
    if (!addonGroups) return [];
    return addonGroups
      .filter((g) => g.active)
      .map((group) => ({
        group,
        addons: activeAddons.filter((a) => a.addon_group_id === group.id),
      }));
  }, [addonGroups, activeAddons]);

  if (!item) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-w-md max-h-[90vh] flex flex-col"
          data-testid="order-item-edit-modal"
        >
          <DialogHeader>
            <DialogTitle className="pr-8 text-base flex items-center justify-between">
              <span>Editar: {item.product_name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="order-item-delete-button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-4 pr-2">
              {/* Quantity selector */}
              <div className="flex items-center justify-between">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="order-item-edit-qty-decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium text-lg">{quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="order-item-edit-qty-increase"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Addon groups */}
              {addonsByGroup.map(({ group, addons: groupAddons }) =>
                groupAddons.length > 0 ? (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label className="font-medium">{group.name}</Label>
                      {group.required && (
                        <Badge variant="secondary" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}
                      {group.max_selections > 0 && (
                        <span className="text-xs text-muted-foreground">
                          (máx. {group.max_selections})
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 pl-1">
                      {groupAddons.map((addon) => {
                        const isSelected = selectedAddons.has(addon.id);
                        const qty = selectedAddons.get(addon.id) || 0;

                        return (
                          <div
                            key={addon.id}
                            className="flex items-center justify-between py-2 min-h-[44px]"
                            data-testid={`order-item-edit-addon-${addon.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  handleAddonToggle(addon.id, !!checked)
                                }
                                className="h-5 w-5"
                              />
                              <div>
                                <span className="text-sm">{addon.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  +{formatPrice(addon.price)}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleAddonQuantityChange(addon.id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm">{qty}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleAddonQuantityChange(addon.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}

              {/* Observation */}
              <div className="space-y-2">
                <Label htmlFor="edit-observation">Observação</Label>
                <Textarea
                  id="edit-observation"
                  placeholder="Ex: Sem cebola, bem passado..."
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="resize-none"
                  rows={2}
                  data-testid="order-item-edit-observation"
                />
              </div>

              {/* Item price info */}
              <div className="text-sm text-muted-foreground">
                Preço unitário: {formatPrice(item.product_price)}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="min-h-[44px]"
              data-testid="order-item-edit-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="min-h-[44px]"
              disabled={updateItem.isPending}
              data-testid="order-item-edit-save"
            >
              {updateItem.isPending ? "Salvando..." : `Salvar ${formatPrice(calculateTotal())}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item do pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              O item "{item.product_name}" será removido do pedido e o total será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteItem.isPending}
            >
              {deleteItem.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
