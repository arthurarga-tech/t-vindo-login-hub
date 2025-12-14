import { useState, useEffect } from "react";
import { BookOpen, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryList } from "@/components/catalogo/CategoryList";
import { CategoryForm } from "@/components/catalogo/CategoryForm";
import { ProductList } from "@/components/catalogo/ProductList";
import { ProductForm } from "@/components/catalogo/ProductForm";
import { AddonGroupManager } from "@/components/catalogo/AddonGroupManager";
import { useEstablishment } from "@/hooks/useEstablishment";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  Category,
} from "@/hooks/useCategories";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  Product,
} from "@/hooks/useProducts";

export default function Catalogo() {
  const { data: establishment, isLoading: isLoadingEstablishment } = useEstablishment();
  const establishmentId = establishment?.id;

  const { data: categories = [], isLoading: isLoadingCategories } = useCategories(establishmentId);
  const createCategory = useCreateCategory(establishmentId);
  const updateCategory = useUpdateCategory(establishmentId);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  const { data: products = [], isLoading: isLoadingProducts } = useProducts(
    establishmentId,
    selectedCategory?.id
  );
  const createProduct = useCreateProduct(establishmentId);
  const updateProduct = useUpdateProduct(establishmentId);

  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  // Select first category by default
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // Update selected category reference when categories change
  useEffect(() => {
    if (selectedCategory) {
      const updated = categories.find((c) => c.id === selectedCategory.id);
      if (updated) {
        setSelectedCategory(updated);
      }
    }
  }, [categories, selectedCategory?.id]);

  const handleCreateCategory = () => {
    setEditingCategory(undefined);
    setCategoryFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormOpen(true);
  };

  const handleCategorySubmit = async (data: any) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, data });
    } else {
      await createCategory.mutateAsync(data);
    }
    setCategoryFormOpen(false);
    setEditingCategory(undefined);
  };

  const handleCreateProduct = () => {
    setEditingProduct(undefined);
    setProductFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormOpen(true);
  };

  const handleProductSubmit = async (data: any) => {
    const productData = {
      ...data,
      category_id: data.category_id || selectedCategory?.id,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, data: productData });
    } else {
      await createProduct.mutateAsync(productData);
    }
    setProductFormOpen(false);
    setEditingProduct(undefined);
  };

  if (isLoadingEstablishment) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Catálogo</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Você precisa estar vinculado a um estabelecimento para gerenciar o catálogo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Catálogo</h1>
        </div>
        <Button onClick={handleCreateCategory}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Categorias</CardTitle>
            <CardDescription>
              {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CategoryList
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                onEdit={handleEditCategory}
                establishmentId={establishmentId}
              />
            )}
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedCategory ? selectedCategory.name : "Produtos"}
                </CardTitle>
                <CardDescription>
                  {products.length} {products.length === 1 ? "produto" : "produtos"}
                  {selectedCategory && !selectedCategory.active && " (categoria inativa)"}
                </CardDescription>
              </div>
              <Button onClick={handleCreateProduct} disabled={!selectedCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCategory ? (
              <div className="text-center py-12 text-muted-foreground">
                Selecione uma categoria para ver os produtos
              </div>
            ) : (
              <Tabs defaultValue="products">
                <TabsList className="mb-4">
                  <TabsTrigger value="products">Produtos</TabsTrigger>
                  <TabsTrigger value="addons">Adicionais</TabsTrigger>
                </TabsList>
                <TabsContent value="products">
                  <ProductList
                    products={products}
                    onEdit={handleEditProduct}
                    establishmentId={establishmentId}
                    isLoading={isLoadingProducts}
                  />
                </TabsContent>
                <TabsContent value="addons">
                  <AddonGroupManager
                    categoryId={selectedCategory.id}
                    establishmentId={establishmentId!}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Form Dialog */}
      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        category={editingCategory}
        onSubmit={handleCategorySubmit}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />

      {/* Product Form Dialog */}
      <ProductForm
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        product={editingProduct}
        categories={categories}
        onSubmit={handleProductSubmit}
        isLoading={createProduct.isPending || updateProduct.isPending}
      />
    </div>
  );
}
