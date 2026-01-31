import { useState, useMemo } from "react";
import { Plus, Minus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/formatters";
import { useProducts, Product } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useAddonGroups, useAddonsForGroups } from "@/hooks/useAddons";
import { useAddOrderItem, OrderItemAddonInput } from "@/hooks/useOrderItemMutations";
import { useEstablishment } from "@/hooks/useEstablishment";
import { toast } from "sonner";

interface OrderAddItemModalProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

export function OrderAddItemModal({
  orderId,
  open,
  onClose,
}: OrderAddItemModalProps) {
  const [step, setStep] = useState<"select" | "customize">("select");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");

  const { data: establishment } = useEstablishment();
  const { data: categories } = useCategories(establishment?.id);
  const { data: products } = useProducts(establishment?.id);
  const addItem = useAddOrderItem();

  const activeProducts = useMemo(
    () => products?.filter((p) => p.active) || [],
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return activeProducts;
    const term = searchTerm.toLowerCase();
    return activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [activeProducts, searchTerm]);

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    filteredProducts.forEach((product) => {
      const categoryId = product.category_id || "uncategorized";
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(product);
    });
    return grouped;
  }, [filteredProducts]);

  // Addon groups for selected product
  const { data: addonGroups } = useAddonGroups(selectedProduct?.category_id ?? undefined);
  const activeGroupIds = useMemo(
    () => addonGroups?.filter((g) => g.active).map((g) => g.id) || [],
    [addonGroups]
  );
  const { data: addons } = useAddonsForGroups(activeGroupIds);
  const activeAddons = useMemo(() => addons?.filter((a) => a.active) || [], [addons]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setObservation("");
    setSelectedAddons(new Map());
    setStep("customize");
  };

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
    if (!selectedProduct) return 0;
    let total = selectedProduct.price * quantity;
    selectedAddons.forEach((qty, addonId) => {
      const addon = activeAddons.find((a) => a.id === addonId);
      if (addon) {
        total += addon.price * qty * quantity;
      }
    });
    return total;
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return;

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
      await addItem.mutateAsync({
        orderId,
        item: {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_price: selectedProduct.price,
          quantity,
          observation: observation.trim() || undefined,
          addons: addonsData,
        },
      });
      toast.success("Item adicionado ao pedido");
      handleClose();
    } catch (error) {
      toast.error("Erro ao adicionar item");
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedProduct(null);
    setQuantity(1);
    setObservation("");
    setSelectedAddons(new Map());
    setSearchTerm("");
    onClose();
  };

  const handleBack = () => {
    setStep("select");
    setSelectedProduct(null);
    setQuantity(1);
    setObservation("");
    setSelectedAddons(new Map());
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] flex flex-col"
        data-testid="order-add-item-modal"
      >
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Adicionar Item" : `Adicionar: ${selectedProduct?.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="order-add-item-search"
              />
            </div>

            {/* Products list */}
            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="space-y-4 pr-2">
                {Array.from(productsByCategory.entries()).map(([categoryId, categoryProducts]) => {
                  const category = categories?.find((c) => c.id === categoryId);
                  return (
                    <div key={categoryId} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {category?.name || "Sem categoria"}
                      </h4>
                      <div className="space-y-1">
                        {categoryProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
                            data-testid={`order-add-item-product-${product.id}`}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{product.name}</p>
                              {product.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {product.description}
                                </p>
                              )}
                            </div>
                            <span className="font-medium text-sm text-primary">
                              {formatPrice(product.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum produto encontrado
                  </p>
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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
                      data-testid="order-add-item-qty-decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium text-lg">{quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => setQuantity(quantity + 1)}
                      data-testid="order-add-item-qty-increase"
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
                  <Label htmlFor="add-observation">Observação</Label>
                  <Textarea
                    id="add-observation"
                    placeholder="Ex: Sem cebola, bem passado..."
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>

                {/* Product price info */}
                {selectedProduct && (
                  <div className="text-sm text-muted-foreground">
                    Preço unitário: {formatPrice(selectedProduct.price)}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button variant="outline" onClick={handleBack} className="min-h-[44px]">
                Voltar
              </Button>
              <Button
                onClick={handleAddItem}
                className="min-h-[44px]"
                disabled={addItem.isPending}
              >
                {addItem.isPending ? "Adicionando..." : `Adicionar ${formatPrice(calculateTotal())}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
