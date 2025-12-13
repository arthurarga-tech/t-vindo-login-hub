import { useState } from "react";
import { Edit2, Trash2, Eye, EyeOff, Package } from "lucide-react";
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
import { Product, useDeleteProduct, useUpdateProduct } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  establishmentId: string;
  isLoading?: boolean;
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

  const productToDelete = products.find((p) => p.id === deleteId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card
            key={product.id}
            className={cn(
              "group relative overflow-hidden transition-shadow hover:shadow-md",
              !product.active && "opacity-60"
            )}
          >
            <CardContent className="p-0">
              {product.image_url ? (
                <div className="aspect-video relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {!product.active && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Badge variant="secondary">Inativo</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-primary whitespace-nowrap">
                    {formatPrice(product.price)}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleActive(product)}
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
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto "{productToDelete?.name}" será excluído permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
