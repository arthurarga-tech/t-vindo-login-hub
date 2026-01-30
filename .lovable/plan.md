
# Plano: Botão de Editar Produto no Carrinho do Pedido Rápido

## Objetivo
Adicionar funcionalidade de edição de itens do carrinho no fluxo de "Novo Pedido - Balcão", permitindo modificar adicionais, quantidade e observação de produtos já adicionados, com foco na experiência mobile.

---

## Análise do Problema

Atualmente no `QuickOrderCart.tsx`:
- Permite apenas alterar quantidade (+/-)
- Permite remover item (lixeira)
- **Não há opção de editar adicionais ou observação**

O usuário precisa excluir e adicionar novamente o produto caso queira alterar um adicional.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────┐
│           QuickOrderCart                     │
│  ┌─────────────────────────────────────────┐│
│  │ [Produto] [Adicionais] [Preço]          ││
│  │ [−] 1 [+]  [✏️ Editar] [🗑️ Excluir]    ││ ← NOVO botão Editar
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
          │
          ▼ (ao clicar em Editar)
┌─────────────────────────────────────────────┐
│        QuickOrderEditItemModal (NOVO)       │
│  ┌─────────────────────────────────────────┐│
│  │ Nome do Produto                         ││
│  │ ─────────────────────                   ││
│  │ Quantidade: [−] 2 [+]                   ││
│  │ ─────────────────────                   ││
│  │ ☑ Adicional 1 (+R$ 2,00)  [−] 1 [+]    ││
│  │ ☐ Adicional 2 (+R$ 3,00)               ││
│  │ ─────────────────────                   ││
│  │ Observação: [_______________]           ││
│  │ ─────────────────────                   ││
│  │ [Cancelar]        [Salvar R$ XX,XX]    ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## Mudanças Detalhadas

### 1. Novo Componente: QuickOrderEditItemModal.tsx

**Arquivo:** `src/components/pedidos/QuickOrderEditItemModal.tsx` (criar)

**Funcionalidades:**
- Recebe o item do carrinho para edição
- Carrega os addon groups da categoria do produto
- Permite alterar quantidade
- Permite marcar/desmarcar adicionais e suas quantidades
- Permite editar observação
- Botão "Salvar" atualiza o item no carrinho
- Botão "Cancelar" fecha sem salvar

**Props:**
```typescript
interface QuickOrderEditItemModalProps {
  item: QuickOrderCartItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedItem: QuickOrderCartItem) => void;
  establishmentId: string;
}
```

**Características Mobile-First:**
- Touch targets mínimo 44x44px
- Scroll interno para lista de adicionais
- Botões de ação no rodapé sempre visíveis
- Layout vertical otimizado para telas pequenas

---

### 2. Modificar QuickOrderCart.tsx

**Arquivo:** `src/components/pedidos/QuickOrderCart.tsx`

**Mudanças:**

1. Adicionar prop `onEditItem` para callback de edição
2. Adicionar botão de editar (ícone Pencil) ao lado do botão de excluir
3. Layout compacto para mobile: botões de ação em linha

**Antes:**
```text
[−] 1 [+] [🗑️]
```

**Depois:**
```text
[−] 1 [+] [✏️] [🗑️]
```

**Props atualizadas:**
```typescript
interface QuickOrderCartProps {
  items: QuickOrderCartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onEditItem: (item: QuickOrderCartItem) => void;  // NOVO
}
```

---

### 3. Modificar QuickOrderModal.tsx

**Arquivo:** `src/components/pedidos/QuickOrderModal.tsx`

**Mudanças:**

1. Adicionar estado para item em edição: `editingItem`
2. Adicionar handler `handleEditItem` para abrir modal de edição
3. Adicionar handler `handleSaveEditedItem` para salvar alterações
4. Integrar `QuickOrderEditItemModal`
5. Passar callback `onEditItem` para `QuickOrderCart`

**Novo estado:**
```typescript
const [editingItem, setEditingItem] = useState<QuickOrderCartItem | null>(null);
```

**Novo handler:**
```typescript
const handleSaveEditedItem = useCallback((updatedItem: QuickOrderCartItem) => {
  setCartItems((prev) =>
    prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
  );
  setEditingItem(null);
}, []);
```

---

### 4. Interface QuickOrderCartItem

**Arquivo:** `src/components/pedidos/QuickOrderCart.tsx`

**Mudança:** Adicionar `categoryId` ao item para poder carregar os adicionais corretos

```typescript
export interface QuickOrderCartItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  observation?: string;
  categoryId: string;  // NOVO - necessário para carregar addon groups
  addons: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}
```

---

### 5. Modificar QuickOrderProductList.tsx

**Arquivo:** `src/components/pedidos/QuickOrderProductList.tsx`

**Mudança:** Incluir `categoryId` ao adicionar item

```typescript
onAddItem({
  productId: product.id,
  productName: product.name,
  productPrice: product.price,
  categoryId: category.id,  // NOVO
  quantity: 1,
  addons: [],
});
```

---

## Arquivos a Modificar/Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/pedidos/QuickOrderEditItemModal.tsx` | Criar | Modal de edição de item |
| `src/components/pedidos/QuickOrderCart.tsx` | Modificar | Adicionar botão editar e prop onEditItem |
| `src/components/pedidos/QuickOrderModal.tsx` | Modificar | Integrar modal de edição e handlers |
| `src/components/pedidos/QuickOrderProductList.tsx` | Modificar | Incluir categoryId nos itens |

---

## Seção Técnica

### QuickOrderEditItemModal.tsx - Estrutura

```typescript
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { useAddonGroups, useAddonsForGroups } from "@/hooks/useAddons";
import { QuickOrderCartItem } from "./QuickOrderCart";

interface QuickOrderEditItemModalProps {
  item: QuickOrderCartItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedItem: QuickOrderCartItem) => void;
}

export function QuickOrderEditItemModal({ item, open, onClose, onSave }: QuickOrderEditItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());
  
  const { data: addonGroups } = useAddonGroups(item?.categoryId);
  // ... carregar addons e lógica de edição
  
  // Inicializar estado com dados do item ao abrir
  useEffect(() => {
    if (item && open) {
      setQuantity(item.quantity);
      setObservation(item.observation || "");
      const addonsMap = new Map<string, number>();
      item.addons.forEach(addon => addonsMap.set(addon.id, addon.quantity));
      setSelectedAddons(addonsMap);
    }
  }, [item, open]);

  const handleSave = () => {
    if (!item) return;
    // Construir item atualizado e chamar onSave
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Conteúdo do modal similar ao ProductAddonSelector */}
    </Dialog>
  );
}
```

### QuickOrderCart.tsx - Botão de Editar

```typescript
// Adicionar ao layout de cada item:
<Button
  size="icon"
  variant="ghost"
  className="h-7 w-7"
  onClick={() => onEditItem(item)}
  data-testid={`quick-order-cart-item-edit-${item.id}`}
  aria-label="Editar item"
>
  <Pencil className="h-3 w-3" />
</Button>
```

### QuickOrderModal.tsx - Integração

```typescript
// Estado para edição
const [editingItem, setEditingItem] = useState<QuickOrderCartItem | null>(null);

// Handler para salvar
const handleSaveEditedItem = useCallback((updatedItem: QuickOrderCartItem) => {
  setCartItems((prev) =>
    prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
  );
  setEditingItem(null);
  toast.success("Item atualizado", { duration: 1000 });
}, []);

// Render
<QuickOrderCart
  items={cartItems}
  onUpdateQuantity={handleUpdateQuantity}
  onRemoveItem={handleRemoveItem}
  onEditItem={setEditingItem}  // NOVO
/>

<QuickOrderEditItemModal
  item={editingItem}
  open={editingItem !== null}
  onClose={() => setEditingItem(null)}
  onSave={handleSaveEditedItem}
/>
```

---

## Considerações Mobile-First

- **Touch targets**: Todos os botões com mínimo 44x44px
- **Layout responsivo**: Modal ocupa 95% da largura em mobile
- **Scroll interno**: Lista de adicionais com scroll se necessário
- **Botões fixos**: Footer com ações sempre visível
- **Feedback visual**: Toast de confirmação ao salvar
- **Animação suave**: Transição ao abrir/fechar modal

---

## Testes a Realizar

1. Adicionar produto com adicionais
2. Clicar em Editar no carrinho
3. Verificar se adicionais selecionados estão marcados
4. Alterar seleção de adicionais
5. Alterar quantidade
6. Editar observação
7. Salvar e verificar atualização no carrinho
8. Cancelar edição e verificar que item não mudou
9. Testar em viewport mobile (390x844)
