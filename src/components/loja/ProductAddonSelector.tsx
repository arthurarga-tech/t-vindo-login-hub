import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { AddonGroup, Addon } from "@/hooks/useAddons";

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
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getAddonsForGroup = (groupId: string) => {
    return addons.filter((a) => a.addon_group_id === groupId);
  };

  const getSelectedCountForGroup = (groupId: string) => {
    return selectedAddons.filter(
      (sa) => sa.addon.addon_group_id === groupId
    ).reduce((sum, sa) => sum + sa.quantity, 0);
  };

  const isAddonSelected = (addonId: string) => {
    return selectedAddons.some((sa) => sa.addon.id === addonId);
  };

  const handleToggleAddon = (addon: Addon, group: AddonGroup) => {
    const isSelected = isAddonSelected(addon.id);
    const currentCount = getSelectedCountForGroup(group.id);

    if (isSelected) {
      // Remove addon
      onSelectionChange(selectedAddons.filter((sa) => sa.addon.id !== addon.id));
    } else {
      // Check if we can add more
      if (currentCount >= group.max_selections) {
        return; // Max reached
      }
      // Add addon
      onSelectionChange([...selectedAddons, { addon, quantity: 1 }]);
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
                const isSelected = isAddonSelected(addon.id);
                const isDisabled = !isSelected && selectedCount >= group.max_selections;

                return (
                  <div
                    key={addon.id}
                    className={`flex items-center justify-between p-2 rounded-md border ${
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    } ${isDisabled ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}`}
                    onClick={() => !isDisabled && handleToggleAddon(addon, group)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => handleToggleAddon(addon, group)}
                      />
                      <Label className="cursor-pointer">{addon.name}</Label>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      +{formatPrice(addon.price)}
                    </span>
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
      const count = selectedAddons.filter(
        (sa) => sa.addon.addon_group_id === group.id
      ).reduce((sum, sa) => sum + sa.quantity, 0);

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
