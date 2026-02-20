import { useState, useMemo } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/formatters";
import { useCategories } from "@/hooks/useCategories";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAddonsForGroups, AddonGroup, Addon } from "@/hooks/useAddons";
import { usePublicAddonGroups } from "@/hooks/usePublicAddons";

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ProductSelectionResult {
  productId: string;
  productName: string;
  productPrice: number;
  categoryId: string;
  quantity: number;
  observation?: string;
  addons: SelectedAddon[];
}

interface ProductSelectorProps {
  establishmentId: string;
  onSelectProduct: (data: ProductSelectionResult) => void;
}

/* ── Addon customization dialog ── */

function AddonCustomizeDialog({
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
  const [selected, setSelected] = useState<Map<string, number>>(new Map());

  const toggle = (addon: Addon, checked: boolean) => {
    const m = new Map(selected);
    checked ? m.set(addon.id, 1) : m.delete(addon.id);
    setSelected(m);
  };

  const changeQty = (addon: Addon, delta: number) => {
    const m = new Map(selected);
    const v = Math.max(0, (m.get(addon.id) || 0) + delta);
    v === 0 ? m.delete(addon.id) : m.set(addon.id, v);
    setSelected(m);
  };

  const total = useMemo(() => {
    let t = product.price * quantity;
    selected.forEach((qty, id) => {
      const a = addons.find((x) => x.id === id);
      if (a) t += a.price * qty * quantity;
    });
    return t;
  }, [product, quantity, selected, addons]);

  const handleConfirm = () => {
    const arr: SelectedAddon[] = [];
    selected.forEach((qty, id) => {
      const a = addons.find((x) => x.id === id);
      if (a && qty > 0) arr.push({ id: a.id, name: a.name, price: a.price, quantity: qty });
    });
    onConfirm(quantity, observation, arr);
  };

  const grouped = useMemo(
    () => addonGroups.map((g) => ({ group: g, addons: addons.filter((a) => a.addon_group_id === g.id) })),
    [addonGroups, addons]
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md flex flex-col" data-testid="product-selector-addon-dialog">
        <DialogHeader>
          <DialogTitle className="pr-8">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[60vh]">
          {/* Quantity */}
          <div className="flex items-center justify-between">
            <Label>Quantidade</Label>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-11 w-11" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium text-lg">{quantity}</span>
              <Button size="icon" variant="outline" className="h-11 w-11" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Addon groups */}
          {grouped.map(({ group, addons: ga }) =>
            ga.length > 0 ? (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="font-medium">{group.name}</Label>
                  {group.required && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
                  {group.max_selections > 0 && (
                    <span className="text-xs text-muted-foreground">(máx. {group.max_selections})</span>
                  )}
                </div>
                <div className="space-y-2 pl-1">
                  {ga.map((addon) => {
                    const isOn = selected.has(addon.id);
                    const q = selected.get(addon.id) || 0;
                    return (
                      <div key={addon.id} className="flex items-center justify-between py-2 min-h-[48px]">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isOn} onCheckedChange={(c) => toggle(addon, !!c)} className="h-5 w-5" />
                          <div>
                            <span className="text-sm">{addon.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">+{formatPrice(addon.price)}</span>
                          </div>
                        </div>
                        {isOn && (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => changeQty(addon, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{q}</span>
                            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => changeQty(addon, 1)}>
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
            <Label htmlFor="ps-observation">Observação</Label>
            <Textarea
              id="ps-observation"
              placeholder="Ex: Sem cebola, bem passado..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Preço unitário: {formatPrice(product.price)}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={onCancel} className="min-h-[44px]">Cancelar</Button>
          <Button onClick={handleConfirm} className="min-h-[44px]">Adicionar {formatPrice(total)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main ProductSelector ── */

export function ProductSelector({ establishmentId, onSelectProduct }: ProductSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  const { data: categories, isLoading: catLoading } = useCategories(establishmentId);
  const { data: products, isLoading: prodLoading } = useProducts(establishmentId);

  const activeCategories = useMemo(() => categories?.filter((c) => c.active) || [], [categories]);
  const activeProducts = useMemo(() => products?.filter((p) => p.active) || [], [products]);

  const filtered = useMemo(() => {
    let list = activeProducts;
    if (selectedCategory) list = list.filter((p) => p.category_id === selectedCategory);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || p.description?.toLowerCase().includes(t));
    }
    return list;
  }, [activeProducts, selectedCategory, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    filtered.forEach((p) => {
      const key = p.category_id || "uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [filtered]);

  // Addon data for the product being customized
  const { data: addonGroups } = usePublicAddonGroups(customizingProduct?.category_id ?? undefined);
  const activeGroupIds = useMemo(() => addonGroups?.filter((g) => g.active).map((g) => g.id) || [], [addonGroups]);
  const { data: addons } = useAddonsForGroups(activeGroupIds);
  const activeAddons = useMemo(() => addons?.filter((a) => a.active) || [], [addons]);

  const handleProductClick = (product: Product) => {
    setCustomizingProduct(product);
  };

  const handleConfirm = (quantity: number, observation: string, selectedAddons: SelectedAddon[]) => {
    if (!customizingProduct) return;
    onSelectProduct({
      productId: customizingProduct.id,
      productName: customizingProduct.name,
      productPrice: customizingProduct.price,
      categoryId: customizingProduct.category_id || "",
      quantity,
      observation: observation.trim() || undefined,
      addons: selectedAddons,
    });
    setCustomizingProduct(null);
  };

  if (catLoading || prodLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0" data-testid="product-selector">
      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 shrink-0">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
            selectedCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Todos
        </button>
        {activeCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="product-selector-search"
        />
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-4 pr-1">
          {Array.from(grouped.entries()).map(([catId, prods]) => {
            const cat = categories?.find((c) => c.id === catId);
            return (
              <div key={catId} className="space-y-1">
                <h4 className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-1 z-10">
                  {cat?.name || "Sem categoria"}
                </h4>
                <div className="space-y-0.5">
                  {prods.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 active:bg-accent transition-colors text-left min-h-[48px]"
                      data-testid={`product-selector-item-${product.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                        )}
                      </div>
                      <span className="font-medium text-sm text-primary ml-2 shrink-0">
                        {formatPrice(product.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
          )}
        </div>
      </div>

      {/* Addon dialog */}
      {customizingProduct && addonGroups && (
        <AddonCustomizeDialog
          product={customizingProduct}
          addonGroups={addonGroups.filter((g) => g.active)}
          addons={activeAddons}
          onConfirm={handleConfirm}
          onCancel={() => setCustomizingProduct(null)}
        />
      )}
    </div>
  );
}
