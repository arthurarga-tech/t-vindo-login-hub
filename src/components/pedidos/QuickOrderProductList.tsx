import { ProductSelector, ProductSelectionResult } from "./ProductSelector";

interface QuickOrderProductListProps {
  establishmentId: string;
  onAddItem: (item: ProductSelectionResult) => void;
}

export function QuickOrderProductList({ establishmentId, onAddItem }: QuickOrderProductListProps) {
  return (
    <ProductSelector
      establishmentId={establishmentId}
      onSelectProduct={onAddItem}
    />
  );
}
