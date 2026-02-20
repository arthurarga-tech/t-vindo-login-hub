import { useState, useEffect, useMemo } from "react";
import { Plus, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import { useAddonsForGroups } from "@/hooks/useAddons";
import { usePublicAddonGroups } from "@/hooks/usePublicAddons";
import { QuickOrderCartItem } from "./QuickOrderCart";

interface QuickOrderEditItemModalProps {
  item: QuickOrderCartItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedItem: QuickOrderCartItem) => void;
}

export function QuickOrderEditItemModal({
  item,
  open,
  onClose,
  onSave,
}: QuickOrderEditItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());

  const { data: addonGroups } = usePublicAddonGroups(item?.categoryId);
  const activeGroupIds = useMemo(
    () => addonGroups?.filter((g) => g.active).map((g) => g.id) || [],
    [addonGroups]
  );
  const { data: addons } = useAddonsForGroups(activeGroupIds);
  const activeAddons = useMemo(() => addons?.filter((a) => a.active) || [], [addons]);

  // Initialize state when modal opens with item data
  useEffect(() => {
    if (item && open) {
      setQuantity(item.quantity);
      setObservation(item.observation || "");
      const addonsMap = new Map<string, number>();
      item.addons.forEach((addon) => addonsMap.set(addon.id, addon.quantity));
      setSelectedAddons(addonsMap);
    }
  }, [item, open]);

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
    let total = item.productPrice * quantity;
    selectedAddons.forEach((qty, addonId) => {
      const addon = activeAddons.find((a) => a.id === addonId);
      if (addon) {
        total += addon.price * qty * quantity;
      }
    });
    return total;
  };

  const handleSave = () => {
    if (!item) return;

    const updatedAddons = Array.from(selectedAddons.entries())
      .map(([addonId, qty]) => {
        const addon = activeAddons.find((a) => a.id === addonId);
        if (addon && qty > 0) {
          return {
            id: addon.id,
            name: addon.name,
            price: addon.price,
            quantity: qty,
          };
        }
        return null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    const updatedItem: QuickOrderCartItem = {
      ...item,
      quantity,
      observation: observation.trim() || undefined,
      addons: updatedAddons,
    };

    onSave(updatedItem);
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md max-h-[90vh] flex flex-col"
        data-testid="quick-order-edit-item-modal"
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">{item.productName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1">
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
                  data-testid="quick-order-edit-qty-decrease"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium text-lg">{quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10"
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="quick-order-edit-qty-increase"
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
                          data-testid={`quick-order-edit-addon-item-${addon.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleAddonToggle(addon.id, !!checked)
                              }
                              className="h-5 w-5"
                              data-testid={`quick-order-edit-addon-checkbox-${addon.id}`}
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
                                data-testid={`quick-order-edit-addon-qty-decrease-${addon.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{qty}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleAddonQuantityChange(addon.id, 1)}
                                data-testid={`quick-order-edit-addon-qty-increase-${addon.id}`}
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
                data-testid="quick-order-edit-observation"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-h-[44px]"
            data-testid="quick-order-edit-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="min-h-[44px]"
            data-testid="quick-order-edit-save"
          >
            Salvar {formatPrice(calculateTotal())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
