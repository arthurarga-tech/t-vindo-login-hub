
# Reordenação de Adicionais + Revisão Desktop/Mobile

## Diagnóstico do Estado Atual

### Drag-and-drop já implementado:
- **Categorias** (`CategoryList.tsx`): DnD completo com `@dnd-kit`, `GripVertical`, `useReorderCategories`
- **Produtos** (`ProductList.tsx`): DnD completo com `@dnd-kit`, `GripVertical`, `useReorderProducts`
- **Adicionais individuais** (`AddonList.tsx`): sem DnD, sem handle de arraste
- **Grupos globais** (`GlobalAddonGroupManager.tsx`): sem DnD
- **Grupos na categoria** (`CategoryAddonLinkManager.tsx`): sem DnD (apenas "vinculados/disponiveis")
- **Grupos no produto** (`ProductAddonLinkManager.tsx`): sem DnD

### Problema atual no DnD mobile:
O `PointerSensor` do dnd-kit funciona em desktop mas pode ter conflito com scroll em mobile. O padrão correto para mobile é usar `PointerSensor` com `activationConstraint: { distance: 8 }` (evita ativar drag ao scroll) combinado com `TouchSensor`. **Isso afeta todos os DnDs existentes** (categorias e produtos também).

### O que precisa ser implementado:
1. Reordenação dos **adicionais individuais** dentro de um grupo (em `AddonList.tsx`)
2. Reordenação dos **grupos globais** no gerenciador global (`GlobalAddonGroupManager.tsx`)
3. Reordenação dos **grupos vinculados** na seção da categoria (`CategoryAddonLinkManager.tsx` — apenas os "Vinculados")
4. Reordenação dos **grupos vinculados** na seção do produto (`ProductAddonLinkManager.tsx` — seções "Da Categoria" e "Exclusivos")
5. Correção mobile em todos os DnDs existentes

### Análise de compatibilidade da loja pública (Açaí da Jana):
A loja usa `usePublicAddonsForProduct` (já implementado) que busca grupos por produto + categoria, filtra exclusões, e ordena addons por `order_position`. A loja está funcionando corretamente. O risco de regressão é baixo pois a loja apenas lê dados.

---

## Arquitetura da Solução

### Reordenação de grupos — onde salvar a ordem?

Os grupos de adicionais (`addon_groups`) têm `order_position`. Quando reordenados:
- **No gerenciador global**: reordena diretamente `addon_groups.order_position`
- **Na categoria**: a ordem dos grupos vinculados é definida pela ordem em `category_addon_groups`. Como essa tabela não tem `order_position`, a ordem virá do `addon_groups.order_position` (que já existe). Para reordenar grupos especificamente por categoria, precisaríamos de uma coluna na junction table. **Decisão de design**: reordenar via `addon_groups.order_position` (afeta globalmente), mais simples e consistente.
- **No produto**: mesma lógica — reordenar via `addon_groups.order_position`.

### Hook novo: `useReorderAddons` e `useReorderAddonGroups`

```typescript
// Em useAddons.ts
export function useReorderAddons(addonGroupId: string | undefined) { ... }

// Em useGlobalAddonGroups.ts
export function useReorderAddonGroups(establishmentId: string | undefined) { ... }
```

### Correção mobile — sensor unificado

Criar um hook reutilizável `useDndSensors()` com configuração que funciona em desktop e mobile:

```typescript
// src/hooks/useDndSensors.ts
import { useSensor, useSensors, PointerSensor, KeyboardSensor, TouchSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // evita conflito com scroll mobile
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,        // tempo antes de ativar drag no touch
        tolerance: 5,      // pixels de tolerância de movimento
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| `src/hooks/useDndSensors.ts` | Criar — sensores mobile-safe centralizados |
| `src/hooks/useAddons.ts` | Adicionar `useReorderAddons` |
| `src/hooks/useGlobalAddonGroups.ts` | Adicionar `useReorderAddonGroups` |
| `src/components/catalogo/AddonList.tsx` | Adicionar DnD nos adicionais individuais |
| `src/components/catalogo/GlobalAddonGroupManager.tsx` | Adicionar DnD nos grupos globais |
| `src/components/catalogo/CategoryAddonLinkManager.tsx` | Adicionar DnD nos grupos vinculados |
| `src/components/catalogo/ProductAddonLinkManager.tsx` | Adicionar DnD nas seções "Da Categoria" e "Exclusivos" |
| `src/components/catalogo/CategoryList.tsx` | Usar `useDndSensors` (fix mobile) |
| `src/components/catalogo/ProductList.tsx` | Usar `useDndSensors` (fix mobile) |

---

## Detalhes de UX por Componente

### AddonList — DnD nos itens
```
[≡] Paçoca          +R$ 0,00   [👁] [✏️] [🗑]
[≡] Morango         +R$ 0,50   [👁] [✏️] [🗑]
[≡] Chocolate       +R$ 1,00   [👁] [✏️] [🗑]
```
- Handle `GripVertical` à esquerda de cada addon
- Em mobile: ícone sempre visível (sem `opacity-0 group-hover`)
- Ao soltar: salva nova ordem em `addons.order_position` via `useReorderAddons`

### GlobalAddonGroupManager — DnD nos grupos
```
[≡] ▼ Complementos     [Obrig] [0-10]  [⚙] [🗑]
[≡] ▼ Bebidas          [0-3]           [⚙] [🗑]
```
- Handle `GripVertical` antes do ícone de expand
- Ao soltar: salva nova ordem em `addon_groups.order_position` via `useReorderAddonGroups`

### CategoryAddonLinkManager — DnD nos vinculados
```
Vinculados:
[≡] Complementos     [Remover]
[≡] Bebidas          [Remover]
```
- DnD apenas na seção "Vinculados" (os disponíveis ficam estáticos)
- A ordem salva em `addon_groups.order_position` (impacto global — informar isso)

### ProductAddonLinkManager — DnD nas seções ativas
```
Da Categoria:
[≡] Complementos (heredado)    [Excluir]
[≡] Bebidas (heredado)         [Excluir]

Exclusivos deste produto:
[≡] Cobertura Extra             [Remover]
```
- DnD separado para cada seção
- A ordem também salva em `addon_groups.order_position`

---

## Compatibilidade Mobile — Revisão Geral

### Loja pública (já compatível):
- `ProductDetailModal.tsx`: `sm:max-w-[500px] max-h-[90vh]` — OK
- `ProductAddonSelector.tsx`: botões com `h-7 w-7` — OK para touch
- `StoreHeader.tsx`: layout responsivo com `sm:` breakpoints — OK
- `CartDrawer.tsx`, `CartBar.tsx` — verificar se têm paddings adequados para mobile

### Dashboard (melhorias necessárias):
- `ProductList.tsx`: handle de drag `opacity-0 group-hover:opacity-100` — **invisível em mobile** (sem hover). Será corrigido para mostrar sempre em telas touch
- `CategoryList.tsx`: handle sempre visível — OK
- `AddonList.tsx`: botões pequenos `h-6 w-6` — OK para touch mas podem ser aumentados para `h-7 w-7`

### Sensor fix — impacto:
Substituir o `useSensors` local em `CategoryList` e `ProductList` pelo novo `useDndSensors()` centralizado. O `activationConstraint: { distance: 8 }` previne que o drag se ative durante scroll no mobile.

---

## Nota sobre ordem global vs. por contexto

Quando o usuário reordena grupos no nível de categoria ou produto, a ordem salva em `addon_groups.order_position` é **global** — afeta a ordem em todos os outros contextos onde esse grupo aparece. Isso é aceitável e simplifica a implementação, já que é o mesmo comportamento que categorias e produtos têm (ordem global por estabelecimento).
