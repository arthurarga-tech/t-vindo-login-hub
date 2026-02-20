import { useState, useEffect } from "react";
import { BookOpen, Plus, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryList } from "@/components/catalogo/CategoryList";
import { CategoryForm } from "@/components/catalogo/CategoryForm";
import { ProductList } from "@/components/catalogo/ProductList";
import { ProductForm } from "@/components/catalogo/ProductForm";
import { GlobalAddonGroupManager } from "@/components/catalogo/GlobalAddonGroupManager";
import { CategoryAddonLinkManager } from "@/components/catalogo/CategoryAddonLinkManager";
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
      <div className="flex items-center justify-center h-64" data-testid="catalogo-page-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="space-y-6" data-testid="catalogo-page-no-establishment">
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
    <div className="space-y-4 sm:space-y-6" data-testid="catalogo-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="catalogo-page-title">Catálogo</h1>
        </div>
      </div>

      <Tabs defaultValue="categorias" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="adicionais">
            <Globe className="h-4 w-4 mr-1.5" />
            Adicionais
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Categorias ── */}
        <TabsContent value="categorias">
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleCreateCategory}
              className="w-full sm:w-auto"
              data-testid="catalogo-new-category-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Categories Sidebar */}
            <Card className="lg:col-span-1" data-testid="catalogo-categories-card">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">Categorias</CardTitle>
                <CardDescription className="text-xs sm:text-sm" data-testid="catalogo-categories-count">
                  {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {isLoadingCategories ? (
                  <div className="flex justify-center py-8" data-testid="catalogo-categories-loading">
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

            {/* Products + Addons Grid */}
            <Card className="lg:col-span-3" data-testid="catalogo-products-card">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg" data-testid="catalogo-products-title">
                      {selectedCategory ? selectedCategory.name : "Produtos"}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm" data-testid="catalogo-products-count">
                      {products.length} {products.length === 1 ? "produto" : "produtos"}
                      {selectedCategory && !selectedCategory.active && " (categoria inativa)"}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleCreateProduct}
                    disabled={!selectedCategory}
                    className="w-full sm:w-auto"
                    data-testid="catalogo-new-product-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {!selectedCategory ? (
                  <div
                    className="text-center py-8 sm:py-12 text-muted-foreground text-sm sm:text-base"
                    data-testid="catalogo-no-category-selected"
                  >
                    Selecione uma categoria para ver os produtos
                  </div>
                ) : (
                  <Tabs defaultValue="products" data-testid="catalogo-tabs">
                    <TabsList className="mb-4">
                      <TabsTrigger value="products" data-testid="catalogo-tab-products">Produtos</TabsTrigger>
                      <TabsTrigger value="addons" data-testid="catalogo-tab-addons">Adicionais</TabsTrigger>
                    </TabsList>
                    <TabsContent value="products" data-testid="catalogo-tab-products-content">
                      <ProductList
                        products={products}
                        onEdit={handleEditProduct}
                        establishmentId={establishmentId}
                        isLoading={isLoadingProducts}
                      />
                    </TabsContent>
                    <TabsContent value="addons" data-testid="catalogo-tab-addons-content">
                      <CategoryAddonLinkManager
                        categoryId={selectedCategory.id}
                        establishmentId={establishmentId!}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Adicionais Globais ── */}
        <TabsContent value="adicionais">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Grupos de Adicionais</CardTitle>
              </div>
              <CardDescription>
                Crie grupos reutilizáveis que podem ser vinculados a múltiplas categorias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalAddonGroupManager establishmentId={establishmentId!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
