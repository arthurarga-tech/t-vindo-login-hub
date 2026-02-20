
# Adicionais Exclusivos por Produto no Formulário de Edição

## Contexto

A tabela `product_addon_groups` já existe no banco de dados — ela cria um vínculo entre produtos e grupos de adicionais globais. Porém, ela não está sendo usada em nenhum lugar do frontend. O objetivo é:

1. No formulário de edição de produto, mostrar e gerenciar quais grupos de adicionais estão vinculados àquele produto específico.
2. Atualizar a loja pública para que o cliente veja, ao abrir o detalhe de um produto, os adicionais da categoria **mais** os adicionais exclusivos daquele produto.

## Como Funciona Hoje vs. Como Ficará

**Hoje:** A loja carrega adicionais pela categoria do produto (`usePublicAddonsForCategory(product.category_id)`).

**Após a implementação:**
- Adicionais da categoria (via `category_addon_groups`) → continuam aparecendo para todos os produtos da categoria.
- Adicionais exclusivos do produto (via `product_addon_groups`) → aparecem **apenas** para aquele produto específico.
- Ambos são mesclados e exibidos para o cliente no detalhe do produto.

## O Que Será Implementado

### 1. Novo hook `useProductAddonGroups.ts`

Funções para gerenciar vínculos produto ↔ grupo de adicionais:

- `useProductAddonLinks(productId)` — retorna os IDs dos grupos vinculados ao produto
- `useLinkAddonGroupToProduct()` — insere em `product_addon_groups`
- `useUnlinkAddonGroupFromProduct()` — remove de `product_addon_groups`

### 2. Novo componente `ProductAddonLinkManager.tsx`

Exibido dentro do formulário de edição de produto, abaixo do campo "Descrição (opcional)". Tem o mesmo padrão visual do `CategoryAddonLinkManager`:

- Lista os grupos globais já vinculados ao produto com botão "Remover"
- Lista os grupos disponíveis (ainda não vinculados) com botão "Adicionar"
- Botão "Novo Grupo" que cria um grupo global e já vincula ao produto

### 3. Modificar `ProductForm.tsx`

- Adicionar props `establishmentId?: string` para passar ao `ProductAddonLinkManager`
- Após o campo "Descrição (opcional)", renderizar o `ProductAddonLinkManager` — **apenas em modo de edição** (quando `product` está definido)
- Em modo de criação, a seção não aparece (o produto ainda não existe para ser vinculado)

### 4. Modificar `Catalogo.tsx`

Passar `establishmentId={establishmentId}` para o `ProductForm`.

### 5. Atualizar `usePublicAddons.ts`

Adicionar hook `usePublicAddonsForProduct(productId, categoryId)` que:
- Busca grupos vinculados à categoria via `category_addon_groups`
- Busca grupos vinculados ao produto via `product_addon_groups`
- Mescla os resultados, removendo duplicatas por `id`
- Retorna `{ groups, addons }` no mesmo formato que o hook atual

### 6. Atualizar `ProductDetailModal.tsx` (loja pública)

Substituir `usePublicAddonsForCategory(product?.category_id)` pelo novo `usePublicAddonsForProduct(product?.id, product?.category_id)`.

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| `src/hooks/useProductAddonGroups.ts` | Criar |
| `src/components/catalogo/ProductAddonLinkManager.tsx` | Criar |
| `src/components/catalogo/ProductForm.tsx` | Modificar — adicionar seção de adicionais abaixo de Descrição |
| `src/pages/dashboard/Catalogo.tsx` | Modificar — passar `establishmentId` ao ProductForm |
| `src/hooks/usePublicAddons.ts` | Modificar — adicionar `usePublicAddonsForProduct` |
| `src/components/loja/ProductDetailModal.tsx` | Modificar — usar novo hook |

## Comportamento Esperado

**No dashboard (editar produto):**
- Ao abrir o card de edição, abaixo de "Descrição (opcional)", aparece a seção "Adicionais do Produto"
- Mostra os grupos já vinculados com botão "Remover"
- Mostra grupos disponíveis para adicionar com botão "Adicionar"
- Botão "Novo Grupo" cria e vincula imediatamente
- Vínculos são salvos em tempo real (sem precisar salvar o produto)

**Na loja pública (cliente):**
- Ao abrir um produto, o cliente vê os adicionais da categoria + os adicionais exclusivos do produto
- Mesclados de forma transparente, sem duplicatas

## Nota sobre o Modo de Criação

Quando o usuário clica em "Novo Produto", a seção de adicionais **não aparece** — o produto precisa existir no banco antes de poder vincular grupos. O fluxo correto é: criar o produto → depois editar para adicionar os adicionais específicos.
