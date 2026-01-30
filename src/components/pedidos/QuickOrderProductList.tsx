import { useState } from "react";
import { Plus, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/formatters";
import { useCategories, Category } from "@/hooks/useCategories";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAddonGroups, useAddonsForGroups, AddonGroup, Addon } from "@/hooks/useAddons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface QuickOrderProductListProps {
  establishmentId: string;
  onAddItem: (item: {
    productId: string;
    productName: string;
    productPrice: number;
    categoryId: string;
    quantity: number;
    observation?: string;
    addons: SelectedAddon[];
  }) => void;
}

function ProductAddonSelector({
  product,
  addonGroups,
  addons,
  onConfirm,
  onCancel,
}: {
  product: Product;
  addonGroups: AddonGroup[];
  addons: Addon[];
  onConfirm: (quantity: number, observation: string, selectedAddons: SelectedAddon[]) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());

  const handleAddonToggle = (addon: Addon, checked: boolean) => {
    const newMap = new Map(selectedAddons);
    if (checked) {
      newMap.set(addon.id, 1);
    } else {
      newMap.delete(addon.id);
    }
    setSelectedAddons(newMap);
  };

  const handleAddonQuantityChange = (addon: Addon, delta: number) => {
    const newMap = new Map(selectedAddons);
    const currentQty = newMap.get(addon.id) || 0;
    const newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) {
      newMap.delete(addon.id);
    } else {
      newMap.set(addon.id, newQty);
    }
    setSelectedAddons(newMap);
  };

  const handleConfirm = () => {
    const addonsArray: SelectedAddon[] = [];
    selectedAddons.forEach((qty, addonId) => {
      const addon = addons.find((a) => a.id === addonId);
      if (addon && qty > 0) {
        addonsArray.push({
          id: addon.id,
          name: addon.name,
          price: addon.price,
          quantity: qty,
        });
      }
    });
    onConfirm(quantity, observation, addonsArray);
  };

  const calculateTotal = () => {
    let total = product.price * quantity;
    selectedAddons.forEach((qty, addonId) => {
      const addon = addons.find((a) => a.id === addonId);
      if (addon) {
        total += addon.price * qty * quantity;
      }
    });
    return total;
  };

  // Group addons by their group
  const addonsByGroup = addonGroups.map((group) => ({
    group,
    addons: addons.filter((a) => a.addon_group_id === group.id),
  }));

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md" data-testid="quick-order-addon-dialog">
        <DialogHeader>
          <DialogTitle className="pr-8">{product.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Quantity selector */}
            <div className="flex items-center justify-between">
              <Label>Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  data-testid="quick-order-addon-qty-decrease"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="quick-order-addon-qty-increase"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Addon groups */}
            {addonsByGroup.map(({ group, addons: groupAddons }) =>
              groupAddons.length > 0 ? (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2">
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
                          className="flex items-center justify-between py-1"
                          data-testid={`quick-order-addon-item-${addon.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleAddonToggle(addon, !!checked)}
                              data-testid={`quick-order-addon-checkbox-${addon.id}`}
                            />
                            <span className="text-sm">{addon.name}</span>
                            <span className="text-sm text-muted-foreground">
                              +{formatPrice(addon.price)}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleAddonQuantityChange(addon, -1)}
                                data-testid={`quick-order-addon-qty-decrease-${addon.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-4 text-center text-sm">{qty}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleAddonQuantityChange(addon, 1)}
                                data-testid={`quick-order-addon-qty-increase-${addon.id}`}
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
              <Label htmlFor="observation">Observação</Label>
              <Textarea
                id="observation"
                placeholder="Ex: Sem cebola, bem passado..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="quick-order-addon-observation"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} data-testid="quick-order-addon-cancel">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} data-testid="quick-order-addon-confirm">
            Adicionar {formatPrice(calculateTotal())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({
  category,
  establishmentId,
  onAddItem,
}: {
  category: Category;
  establishmentId: string;
  onAddItem: QuickOrderProductListProps["onAddItem"];
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { data: products, isLoading } = useProducts(establishmentId, category.id);
  const { data: addonGroups } = useAddonGroups(category.id);

  const activeProducts = products?.filter((p) => p.active) || [];
  const activeGroupIds = addonGroups?.filter((g) => g.active).map((g) => g.id) || [];
  const { data: addons } = useAddonsForGroups(activeGroupIds);
  const activeAddons = addons?.filter((a) => a.active) || [];

  const handleProductClick = (product: Product) => {
    // If product has addon groups, show dialog
    if (addonGroups && addonGroups.length > 0) {
      setSelectedProduct(product);
    } else {
      // Add directly without addons
      onAddItem({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        categoryId: category.id,
        quantity: 1,
        addons: [],
      });
    }
  };

  const handleAddonConfirm = (quantity: number, observation: string, selectedAddons: SelectedAddon[]) => {
    if (selectedProduct) {
      onAddItem({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
        categoryId: category.id,
        quantity,
        observation: observation || undefined,
        addons: selectedAddons,
      });
      setSelectedProduct(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (activeProducts.length === 0) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-2 px-3"
            data-testid={`quick-order-category-${category.id}`}
          >
            <span className="font-medium">{category.name}</span>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-2">
          {activeProducts.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleProductClick(product)}
              data-testid={`quick-order-product-${product.id}`}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-medium text-primary whitespace-nowrap">
                    {formatPrice(product.price)}
                  </span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {selectedProduct && addonGroups && (
        <ProductAddonSelector
          product={selectedProduct}
          addonGroups={addonGroups.filter((g) => g.active)}
          addons={activeAddons}
          onConfirm={handleAddonConfirm}
          onCancel={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}

export function QuickOrderProductList({ establishmentId, onAddItem }: QuickOrderProductListProps) {
  const { data: categories, isLoading } = useCategories(establishmentId);
  const [search, setSearch] = useState("");

  const activeCategories = categories?.filter((c) => c.active) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="quick-order-product-list">
      <Input
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="quick-order-product-search"
      />

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-2">
          {activeCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma categoria ativa encontrada
            </p>
          ) : (
            activeCategories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                establishmentId={establishmentId}
                onAddItem={onAddItem}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
