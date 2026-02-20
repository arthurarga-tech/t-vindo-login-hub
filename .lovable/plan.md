
# Adicionais da Categoria na Edição do Produto + Exclusões por Produto

## Contexto e Problema

Hoje, o `ProductAddonLinkManager` no formulário de edição do produto exibe apenas os grupos de adicionais vinculados **diretamente ao produto** via `product_addon_groups`. Os grupos vinculados à **categoria** do produto via `category_addon_groups` não aparecem no formulário — e o usuário não tem como excluí-los para um produto específico.

**Exemplo real:** A categoria "Açaí" tem o grupo "Complementos" vinculado. Ao editar um produto específico dessa categoria ("Açaí Pequeno"), o dono quer que "Complementos" apareça na lista de adicionais e, se necessário, poder desativar esse grupo especificamente para esse produto.

## Arquitetura da Solução

A abordagem é criar um mecanismo de **exclusão**: a tabela `product_addon_exclusions` armazena quais grupos de adicionais da categoria estão **bloqueados** para um produto específico. Na loja pública, ao montar a lista de adicionais, exclui-se os grupos bloqueados.

```text
FLUXO DE ADICIONAIS PARA UM PRODUTO NA LOJA PÚBLICA:
  grupos_da_categoria (via category_addon_groups)
    - MENOS os excluídos (via product_addon_exclusions)
  + grupos_exclusivos_do_produto (via product_addon_groups)
  = adicionais visíveis para o cliente
```

## O Que Será Implementado

### 1. Nova Tabela: `product_addon_exclusions`

```sql
CREATE TABLE product_addon_exclusions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  addon_group_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(product_id, addon_group_id)
);
```

Com RLS permitindo que membros do estabelecimento gerenciem as exclusões, e leitura pública para que a loja consiga filtrar.

### 2. Novo hook `useProductAddonExclusions` (em `useProductAddonGroups.ts`)

- `useProductAddonExclusions(productId)` — retorna IDs dos grupos excluídos para o produto
- `useExcludeAddonFromProduct()` — insere em `product_addon_exclusions` (bloqueia o grupo da categoria para esse produto)
- `useRestoreAddonToProduct()` — remove de `product_addon_exclusions` (restaura o grupo)

### 3. Atualizar `ProductAddonLinkManager.tsx`

O componente agora precisa saber a `categoryId` do produto para poder buscar os grupos da categoria. O layout passa a ter **3 seções**:

```text
[Adicionais do Produto]

--- DA CATEGORIA (herdados) ---
  ✅ Complementos         [Excluir deste produto]
  ✅ Tamanhos             [Excluir deste produto]
  🚫 Molhos (excluído)    [Restaurar]

--- EXCLUSIVOS DESTE PRODUTO ---
  ✅ Cobertura Extra      [Remover]
  
--- DISPONÍVEIS PARA ADICIONAR ---
  ○ Bebidas               [Adicionar]
```

**Regra visual:**
- Grupos da categoria com status "ativo" → fundo verde-claro, botão "Excluir deste produto" (vermelho)
- Grupos da categoria "excluídos" → fundo muted com tachado/badge "Excluído", botão "Restaurar"
- Grupos exclusivos do produto → mesmo visual atual com botão "Remover"
- Grupos disponíveis → mesmo visual atual com botão "Adicionar"

### 4. Atualizar `ProductForm.tsx`

Passar `categoryId={product?.category_id}` para o `ProductAddonLinkManager`, além do `productId` e `establishmentId` já existentes.

### 5. Atualizar `usePublicAddonsForProduct` (`usePublicAddons.ts`)

Adicionar a busca de exclusões ao hook:

```typescript
// Busca exclusões do produto
const exclusions = await supabase
  .from("product_addon_exclusions")
  .select("addon_group_id")
  .eq("product_id", productId);

// Filtra os grupos da categoria removendo os excluídos
const activeExclusionIds = new Set(exclusions.map(e => e.addon_group_id));
const filteredCategoryGroups = categoryGroups.filter(g => !activeExclusionIds.has(g.id));
```

### 6. Novos hooks no `useProductAddonGroups.ts`

```typescript
export function useProductAddonExclusions(productId: string | undefined) { ... }
export function useExcludeAddonFromProduct() { ... }  // INSERT em product_addon_exclusions
export function useRestoreAddonToProduct() { ... }    // DELETE de product_addon_exclusions
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabela `product_addon_exclusions` + RLS |
| `src/hooks/useProductAddonGroups.ts` | Adicionar 3 novos hooks de exclusão |
| `src/components/catalogo/ProductAddonLinkManager.tsx` | Adicionar seção "Da Categoria", lógica de exclusão/restauração |
| `src/components/catalogo/ProductForm.tsx` | Passar `categoryId` ao `ProductAddonLinkManager` |
| `src/hooks/usePublicAddons.ts` | Filtrar grupos excluídos em `usePublicAddonsForProduct` |

## Comportamento Final Esperado

**No dashboard (editar produto "Açaí Pequeno" da categoria "Açaí"):**
- Seção "Da Categoria" aparece automaticamente com todos os grupos vinculados à categoria "Açaí"
- Cada grupo tem botão "Excluir deste produto" → bloqueia só para esse produto
- Grupos excluídos ficam visíveis com badge "Excluído" e botão "Restaurar"
- Seção "Exclusivos deste produto" mostra os grupos vinculados diretamente ao produto

**Na loja pública:**
- Cliente vê os adicionais da categoria MENOS os excluídos + os exclusivos do produto
- Transparente para o cliente — ele simplesmente não vê o que foi excluído
