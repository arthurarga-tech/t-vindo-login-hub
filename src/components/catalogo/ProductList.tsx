import { useState } from "react";
import { Edit2, Trash2, Eye, EyeOff, Package, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Product, useDeleteProduct, useUpdateProduct, useReorderProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDndSensors } from "@/hooks/useDndSensors";

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  establishmentId: string;
  isLoading?: boolean;
}

interface SortableProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleActive: (product: Product) => void;
  formatPrice: (price: number) => string;
}

function SortableProductCard({
  product,
  onEdit,
  onDelete,
  onToggleActive,
  formatPrice,
}: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden transition-shadow hover:shadow-md",
        !product.active && "opacity-60",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
      data-testid={`product-card-${product.id}`}
      role="article"
      aria-label={`Produto ${product.name}`}
    >
      <CardContent className="p-0">
        <div className="absolute top-2 left-2 z-10">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none bg-background/80 rounded p-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            data-testid={`product-card-${product.id}-drag-handle`}
            aria-label="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {product.image_url ? (
          <div className="aspect-video relative">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              data-testid={`product-card-${product.id}-image`}
            />
            {!product.active && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Badge variant="secondary" data-testid={`product-card-${product.id}-inactive-badge`}>
                  Inativo
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="aspect-video bg-muted flex items-center justify-center"
            data-testid={`product-card-${product.id}-placeholder`}
          >
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 
                className="font-medium text-foreground truncate"
                data-testid={`product-card-${product.id}-name`}
              >
                {product.name}
              </h3>
              {product.description && (
                <p 
                  className="text-sm text-muted-foreground line-clamp-2 mt-1"
                  data-testid={`product-card-${product.id}-description`}
                >
                  {product.description}
                </p>
              )}
            </div>
            <span 
              className="text-lg font-semibold text-primary whitespace-nowrap"
              data-testid={`product-card-${product.id}-price`}
            >
              {formatPrice(product.price)}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => onToggleActive(product)}
              data-testid={`product-card-${product.id}-toggle-active-button`}
              aria-label={product.active ? "Ocultar produto" : "Mostrar produto"}
            >
              {product.active ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Mostrar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(product)}
              data-testid={`product-card-${product.id}-edit-button`}
              aria-label="Editar produto"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(product.id)}
              data-testid={`product-card-${product.id}-delete-button`}
              aria-label="Excluir produto"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductList({
  products,
  onEdit,
  establishmentId,
  isLoading,
}: ProductListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteProduct = useDeleteProduct(establishmentId);
  const updateProduct = useUpdateProduct(establishmentId);
  const reorderProducts = useReorderProducts(establishmentId);

  const sensors = useDndSensors();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProduct.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (product: Product) => {
    await updateProduct.mutateAsync({
      id: product.id,
      data: { active: !product.active },
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      
      const newProducts = arrayMove(products, oldIndex, newIndex);
      
      await reorderProducts.mutateAsync(
        newProducts.map((p, i) => ({ id: p.id, order_position: i }))
      );
    }
  };

  const productToDelete = products.find((p) => p.id === deleteId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (isLoading) {
    return (
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="product-list-loading"
        aria-busy="true"
        aria-label="Carregando produtos"
      >
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="aspect-video bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="product-list-empty"
        role="status"
        aria-label="Nenhum produto cadastrado"
      >
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">
          Nenhum produto cadastrado
        </h3>
        <p className="text-sm text-muted-foreground">
          Adicione produtos para esta categoria
        </p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={products.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="product-list"
            role="list"
            aria-label="Lista de produtos"
          >
            {products.map((product) => (
              <SortableProductCard
                key={product.id}
                product={product}
                onEdit={onEdit}
                onDelete={setDeleteId}
                onToggleActive={handleToggleActive}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent data-testid="product-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="product-delete-dialog-title">
              Excluir produto?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="product-delete-dialog-description">
              O produto "{productToDelete?.name}" será excluído permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="product-delete-dialog-cancel">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="product-delete-dialog-confirm"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
