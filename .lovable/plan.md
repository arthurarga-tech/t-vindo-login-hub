
# Revisão Completa — Bugs, Inconsistências e Melhorias

## Resumo Executivo

A análise identificou **6 bugs reais** e **5 melhorias importantes** que precisam ser corrigidas antes da publicação. Nenhum bug é catastrófico, mas juntos comprometem a robustez do sistema de adicionais e a experiência mobile.

---

## Bugs Encontrados

### Bug 1 — CRÍTICO: DnD dentro do ProductForm causa conflito de contexto

**Arquivo:** `ProductAddonLinkManager.tsx`

O `ProductForm` é um `Dialog` do Radix UI. Dentro dele, o `ProductAddonLinkManager` instancia **dois `DndContext` separados** (um para grupos da categoria, outro para grupos exclusivos). O dnd-kit não suporta bem múltiplos `DndContext` aninhados em portais do Radix — isso pode causar falha silenciosa no drag ou conflito de eventos de ponteiro/touch dentro do Dialog.

**Correção:** Unificar os dois contextos DnD em um único `DndContext` usando prefixos nos IDs (`cat-` e `exc-`) já presentes, e separar os itens dentro do mesmo `SortableContext`.

---

### Bug 2 — ALTO: Cache miss ao reordenar grupos no ProductAddonLinkManager

**Arquivo:** `ProductAddonLinkManager.tsx`, linhas 272–285

Ao fazer drag-and-drop na seção "Da Categoria", o componente chama `reorderGroups.mutateAsync()` do hook `useReorderAddonGroups(establishmentId)`. Esse hook invalida somente a query `["global-addon-groups", establishmentId]`. Porém, a lista de grupos da categoria exibida vem de `usePublicAddonsForCategory(categoryId)` — query key `["public-addons-for-category", categoryId]`. Resultado: **a ordem visual muda temporariamente, mas ao refetch a lista volta à ordem antiga**.

**Correção:** Após reordenar, invalidar também as queries `["public-addons-for-category", categoryId]` e `["public-addons-for-product", productId, categoryId]`.

---

### Bug 3 — ALTO: `usePublicAddonsForCategory` usada no dashboard com dados privados

**Arquivo:** `ProductAddonLinkManager.tsx`, linha 197

O componente usa `usePublicAddonsForCategory(categoryId)` — que só retorna grupos **ativos** (`addon_groups.active = true`). Se um grupo global estiver inativo, ele não aparece na seção "Da Categoria" para o administrador, mas ainda poderia estar configurado. Administradores deveriam ver todos os grupos (ativos e inativos) para poder gerenciá-los.

**Correção:** No dashboard, usar `useCategoryAddonLinks(categoryId)` (que retorna IDs sem filtrar por `active`) combinado com o `globalGroups` já disponível (que inclui inativos) para montar a seção "Da Categoria".

---

### Bug 4 — MÉDIO: Reordenação de grupos colide com o escopo

**Arquivo:** `CategoryAddonLinkManager.tsx`, linha 143; `ProductAddonLinkManager.tsx`, linhas 272, 283

Ao arrastar grupos, o hook `useReorderAddonGroups` atualiza `addon_groups.order_position` **globalmente**. Isso é intencional por design, mas o problema é que ele invalida apenas `["global-addon-groups", establishmentId]`, enquanto outras queries que dependem da ordem (`["public-addons-for-category"]`, `["public-addons-for-product"]`) **não são invalidadas**. O cliente vê a ordem errada até o próximo refetch automático.

**Correção:** O `useReorderAddonGroups` deve invalidar também as queries públicas relacionadas.

---

### Bug 5 — MÉDIO: `(as any)` no Supabase client para `product_addon_exclusions`

**Arquivos:** `useProductAddonGroups.ts` (linhas 97, 120, 148), `usePublicAddons.ts` (linha 96)

A tabela `product_addon_exclusions` existe no banco (migração executada e confirmada via schema), mas o `types.ts` não foi regenerado ainda. O cast `as any` é um workaround que elimina a segurança de tipo em runtime — qualquer erro de coluna ou resposta malformada seria silenciado.

**Correção:** Os tipos já foram atualizados via `src/integrations/supabase/types.ts` automaticamente ao rodar a migração. Remover os `as any` e usar o tipo correto. Se o types.ts ainda não reflete a tabela, é necessário garantir a atualização.

---

### Bug 6 — MÉDIO: Race condition no `handleCreateAndLink`

**Arquivo:** `ProductAddonLinkManager.tsx`, linha 237; `CategoryAddonLinkManager.tsx`, linha 125

```typescript
const handleCreateAndLink = async (data: AddonGroupFormData) => {
  const result = await createGroup.mutateAsync(data);
  if (result?.id) {
    await linkMutation.mutateAsync({ productId, addonGroupId: result.id });
  }
  setFormOpen(false);
};
```

Se `createGroup.mutateAsync` retornar erro, `result` será `undefined` e a execução irá para `setFormOpen(false)` sem mostrar erro ao usuário. O formulário fecha sem feedback.

**Correção:** Envolver em `try/catch` explícito — se falhar, não fechar o modal e exibir o toast de erro.

---

## Melhorias Propostas

### Melhoria 1 — Invalidação de cache do `useReorderAddonGroups`

Centralizar a invalidação no próprio hook para incluir as queries `public-addons-for-category` e `public-addons-for-product`. Isso resolve os Bugs 2 e 4 de uma vez.

### Melhoria 2 — `CategoryList` e `ProductList`: handle invisível no mobile

Em `CategoryList.tsx` linha 136: `opacity-0 group-hover:opacity-100` — **invisível em mobile** (sem hover). O handle de arrastar já foi corrigido em `ProductList.tsx` com `sm:opacity-0 sm:group-hover:opacity-100`, mas o `CategoryList.tsx` ainda tem o problema.

**Correção:** Aplicar o mesmo padrão de `ProductList.tsx` no `CategoryList.tsx`.

### Melhoria 3 — Validação de `min_selections > 0` para grupos obrigatórios

Em `validateAddonSelection` (`ProductAddonSelector.tsx`), se `group.required = true` mas `group.min_selections = 0`, a validação sempre passa mesmo sem seleção. Isso é inconsistente — um grupo marcado como obrigatório com `min_selections = 0` não faz sentido.

**Correção:** Na validação, tratar `min_selections = 0` como `min_selections = 1` quando `required = true`.

### Melhoria 4 — Empty state quando produto não tem categoria definida

Em `ProductAddonLinkManager.tsx`, se `categoryId` for `null` ou `undefined`, a seção "Da Categoria" simplesmente não aparece (sem mensagem). O usuário pode ficar confuso achando que não há adicionais disponíveis por outro motivo.

**Correção:** Exibir uma mensagem como: *"Associe este produto a uma categoria para ver os adicionais herdados."*

### Melhoria 5 — `Catalogo.tsx`: `establishmentId!` com non-null assertion

Linha 243: `establishmentId={establishmentId!}` — já há uma guarda `if (!establishment)` antes, então o non-null assertion é seguro. Mas a prop do `ProductForm` usa `establishmentId?: string` (opcional) e na linha 289 passa sem `!`. Isso é inconsistente.

**Correção:** Passar `establishmentId={establishmentId ?? ""}` de forma uniforme, ou tornar a prop obrigatória onde há certeza.

---

## Arquivos a Modificar

| Arquivo | Bugs Corrigidos | Melhorias |
|---|---|---|
| `src/hooks/useGlobalAddonGroups.ts` | Bug 2, Bug 4 | Melhoria 1 |
| `src/components/catalogo/ProductAddonLinkManager.tsx` | Bug 1, Bug 3, Bug 6 | Melhoria 4 |
| `src/components/catalogo/CategoryAddonLinkManager.tsx` | Bug 6 | — |
| `src/hooks/useProductAddonGroups.ts` | Bug 5 | — |
| `src/hooks/usePublicAddons.ts` | Bug 5 | — |
| `src/components/catalogo/CategoryList.tsx` | — | Melhoria 2 |
| `src/components/loja/ProductAddonSelector.tsx` | — | Melhoria 3 |
| `src/pages/dashboard/Catalogo.tsx` | — | Melhoria 5 |

---

## Ordem de Implementação Recomendada

1. Corrigir invalidação de cache no `useReorderAddonGroups` (resolve Bugs 2 e 4 simultaneamente)
2. Unificar DndContext no `ProductAddonLinkManager` (Bug 1)
3. Substituir `usePublicAddonsForCategory` por dados privados na seção "Da Categoria" (Bug 3)
4. Corrigir `handleCreateAndLink` com try/catch (Bug 6 — em ambos os managers)
5. Remover `as any` desnecessários (Bug 5)
6. Corrigir visibilidade do handle no `CategoryList` mobile (Melhoria 2)
7. Corrigir validação de `min_selections` (Melhoria 3)
8. Adicionar empty state para produto sem categoria (Melhoria 4)
9. Uniformizar `establishmentId` no `Catalogo.tsx` (Melhoria 5)
