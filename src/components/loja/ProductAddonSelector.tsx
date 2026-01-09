import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";
import type { AddonGroup, Addon } from "@/hooks/useAddons";
import { formatPrice } from "@/lib/formatters";

export interface SelectedAddon {
  addon: Addon;
  quantity: number;
}

interface ProductAddonSelectorProps {
  groups: AddonGroup[];
  addons: Addon[];
  selectedAddons: SelectedAddon[];
  onSelectionChange: (selected: SelectedAddon[]) => void;
}

export function ProductAddonSelector({
  groups,
  addons,
  selectedAddons,
  onSelectionChange,
}: ProductAddonSelectorProps) {
  const getAddonsForGroup = (groupId: string) => {
    return addons.filter((a) => a.addon_group_id === groupId);
  };

  const getSelectedCountForGroup = (groupId: string) => {
    return selectedAddons
      .filter((sa) => sa.addon.addon_group_id === groupId)
      .reduce((sum, sa) => sum + sa.quantity, 0);
  };

  const getAddonQuantity = (addonId: string) => {
    const selected = selectedAddons.find((sa) => sa.addon.id === addonId);
    return selected?.quantity ?? 0;
  };

  const handleIncrease = (addon: Addon, group: AddonGroup) => {
    const currentCount = getSelectedCountForGroup(group.id);
    if (currentCount >= group.max_selections) return;

    const existing = selectedAddons.find((sa) => sa.addon.id === addon.id);
    if (existing) {
      onSelectionChange(
        selectedAddons.map((sa) =>
          sa.addon.id === addon.id ? { ...sa, quantity: sa.quantity + 1 } : sa
        )
      );
    } else {
      onSelectionChange([...selectedAddons, { addon, quantity: 1 }]);
    }
  };

  const handleDecrease = (addon: Addon) => {
    const existing = selectedAddons.find((sa) => sa.addon.id === addon.id);
    if (!existing) return;

    if (existing.quantity <= 1) {
      onSelectionChange(selectedAddons.filter((sa) => sa.addon.id !== addon.id));
    } else {
      onSelectionChange(
        selectedAddons.map((sa) =>
          sa.addon.id === addon.id ? { ...sa, quantity: sa.quantity - 1 } : sa
        )
      );
    }
  };

  const isGroupValid = (group: AddonGroup) => {
    const count = getSelectedCountForGroup(group.id);
    if (group.required && count < group.min_selections) {
      return false;
    }
    return true;
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupAddons = getAddonsForGroup(group.id);
        const selectedCount = getSelectedCountForGroup(group.id);
        const isValid = isGroupValid(group);
        const canAddMore = selectedCount < group.max_selections;

        return (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{group.name}</span>
                {group.required && (
                  <Badge variant={isValid ? "secondary" : "destructive"} className="text-xs">
                    Obrigatório
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedCount}/{group.max_selections}
              </span>
            </div>

            <div className="space-y-2">
              {groupAddons.map((addon) => {
                const quantity = getAddonQuantity(addon.id);

                return (
                  <div
                    key={addon.id}
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      quantity > 0 ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex-1">
                      <span className="text-sm">{addon.name}</span>
                      <span className="text-sm font-medium text-primary ml-2">
                        +{formatPrice(addon.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {quantity > 0 ? (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => handleDecrease(addon)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">
                            {quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={!canAddMore}
                            onClick={() => handleIncrease(addon, group)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          disabled={!canAddMore}
                          onClick={() => handleIncrease(addon, group)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function validateAddonSelection(
  groups: AddonGroup[],
  selectedAddons: SelectedAddon[]
): { valid: boolean; message?: string } {
  for (const group of groups) {
    if (group.required) {
      const count = selectedAddons
        .filter((sa) => sa.addon.addon_group_id === group.id)
        .reduce((sum, sa) => sum + sa.quantity, 0);

      if (count < group.min_selections) {
        return {
          valid: false,
          message: `Selecione pelo menos ${group.min_selections} item(ns) em "${group.name}"`,
        };
      }
    }
  }
  return { valid: true };
}
