
# Limpeza Final: Remoção dos Grupos Diretos e Refatoração da UI

## Estado Atual Confirmado

A migração anterior foi bem-sucedida:
- **19 grupos globais** (category_id = NULL) foram criados com todos os addons copiados
- **19 vínculos** em `category_addon_groups` estão funcionando corretamente
- Os 19 grupos diretos originais (category_id preenchido) ainda existem e precisam ser removidos

## O Que Será Feito

### 1. Limpeza do Banco de Dados (SQL via migration)

Deletar todos os `addon_groups` onde `category_id IS NOT NULL`. Quando um grupo é deletado, seus `addons` são deletados em cascata automaticamente (FK com ON DELETE CASCADE).

Os 19 grupos diretos a serem removidos:
- **Açaí da Jana (ff858aa6...)**: 5 grupos de "Açaí", 5 de "Açaí 1KG", 2 de "Milk shake", 1 de "Bebidas"
- **Dom Burguer (8db7ea0f...)**: 1 de "Combos", 2 de "Lanches Artesanais", 2 de "Porções"
- **LosHermAnos (cce7305a...)**: 1 de "Lanches"

```sql
-- Deleta todos os grupos diretos (os globais têm category_id IS NULL)
DELETE FROM addon_groups WHERE category_id IS NOT NULL;
```

### 2. Correção do `usePublicAddons.ts`

A função `usePublicAddonGroups` (usada em alguns lugares) ainda busca por `category_id = X`, o que retornará vazio após a limpeza. Ela será atualizada para buscar apenas via `category_addon_groups` (junction table). A função `usePublicAddonsForCategory` já está correta — após a limpeza, a query de "diretos" retornará vazio e a de "globais via junction" retornará tudo normalmente.

### 3. Remoção do Código Legado

**Aba "Adicionais Diretos"** (`Catalogo.tsx`):
- Remover a tab `addons` ("Adicionais Diretos") e seu conteúdo `<AddonGroupManager>`
- A tab `global-links` passa a se chamar **"Adicionais"** (sem o "Globais")
- O botão "Novo Grupo" dentro desta aba abrirá um modal de seleção de grupos globais para vincular

**Renomeação e mudança de comportamento** em `CategoryAddonLinkManager`:
- Renomear para comportamento de "Adicionais" (sem mencionar "global")
- Adicionar botão "Novo Grupo" que abre o `AddonGroupForm` para criar um novo grupo global e já vinculá-lo à categoria automaticamente

**Arquivos a remover ou simplificar**:
- `src/components/catalogo/AddonGroupManager.tsx` — remover completamente (não é mais usado)
- Hooks legados em `useAddons.ts`: `useAddonGroups`, `useCreateAddonGroup`, `useUpdateAddonGroup`, `useDeleteAddonGroup` — remover

### 4. Nova UX da Aba "Adicionais" por Categoria

A tab que antes era "Grupos Globais" passa a ser **"Adicionais"** e terá um novo comportamento:

```text
[Aba: Adicionais]
  - Lista dos grupos globais já vinculados à categoria (com botão Desvincular)
  - Grupos globais disponíveis para vincular (com botão Vincular)
  - Botão "Novo Grupo" → cria grupo global novo E já vincula à categoria
```

O usuário vê apenas "Adicionais" — sem saber que são "globais" internamente.

### 5. Atualização da Tab Global no Catálogo

A aba principal "Adicionais" no nível do catálogo (fora das categorias) mantém o `GlobalAddonGroupManager` onde o dono vê e gerencia todos os grupos do estabelecimento.

## Arquivos Modificados

| Arquivo | Ação |
|---|---|
| Migration SQL | `DELETE FROM addon_groups WHERE category_id IS NOT NULL` |
| `src/hooks/usePublicAddons.ts` | Simplificar `usePublicAddonGroups` para buscar via junction |
| `src/hooks/useAddons.ts` | Remover hooks legados diretos |
| `src/components/catalogo/CategoryAddonLinkManager.tsx` | Novo botão "Novo Grupo", renomear labels |
| `src/components/catalogo/GlobalAddonGroupManager.tsx` | Ajuste de texto (sem mencionar "global") |
| `src/pages/dashboard/Catalogo.tsx` | Remover aba "Adicionais Diretos", renomear "Grupos Globais" para "Adicionais" |
| `src/components/catalogo/AddonGroupManager.tsx` | Deletar arquivo |

## Segurança da Limpeza

- A loja pública (`usePublicAddonsForCategory`) já busca via junction: após deletar os diretos, continuará funcionando sem alteração
- `order_item_addons` guarda `addon_id` dos addons — os addons dos grupos globais (copiados na migração anterior) são **diferentes** dos diretos; os pedidos existentes estão vinculados aos addons originais (diretos), que serão deletados — mas isso é seguro pois `order_item_addons` armazena `addon_name` e `addon_price` diretamente, sem depender do addon existir no futuro
