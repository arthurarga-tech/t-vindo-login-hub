
# Adicionais Globais Reutilizáveis no Catálogo

## Contexto e Problema Atual

Hoje, os grupos de adicionais (`addon_groups`) estão vinculados diretamente a uma `category_id`. Isso significa que o mesmo conjunto de adicionais (ex: "Cereais", "Chocolates", "Frutas") precisa ser recriado manualmente para cada categoria — como já acontece na Açaí da Jana, que tem grupos duplicados em "Açaí" e "Açaí 1KG".

**O objetivo** é criar uma seção "Adicionais" no catálogo onde o dono pode gerenciar grupos de adicionais globais (sem vínculo de categoria) e depois reutilizá-los em múltiplas categorias sem duplicar.

## Estratégia: Sem quebrar o que já funciona

A coluna `category_id` em `addon_groups` já existe e **não será removida**. Os grupos existentes da Açaí da Jana e outros estabelecimentos continuarão funcionando exatamente como antes — eles têm `category_id` preenchido e a loja pública os carrega normalmente.

A nova funcionalidade usa a tabela `category_addon_groups` (já existente no schema como `product_addon_groups`, mas precisamos de uma nova para categorias) para vincular grupos globais a categorias, **complementando** o sistema atual sem substituí-lo.

## Modelo de Dados: Nova Tabela de Vinculação

Criaremos uma tabela `category_addon_groups` para armazenar os vínculos entre grupos globais e categorias:

```sql
CREATE TABLE category_addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  addon_group_id uuid NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, addon_group_id)
);
```

Os grupos globais terão `category_id = NULL` na tabela `addon_groups`. A loja pública será atualizada para também buscar grupos vinculados via `category_addon_groups` além dos diretamente vinculados.

## O Que Muda na Loja Pública (usePublicAddonsForCategory)

A função de busca de adicionais para uma categoria passará a fazer uma **UNION** entre:
1. Grupos com `category_id = <id>` diretamente (existentes, sem alteração)
2. Grupos vinculados via `category_addon_groups` (novos grupos globais)

Isso garante **compatibilidade total** com os dados existentes da Açaí da Jana.

## Fluxo da Nova Interface no Catálogo

```text
Catálogo
├── Categorias  (existente)
│   └── [Categoria] → expandir → Grupos de Adicionais (existente)
│                              → [botão] "Vincular grupo global" (NOVO)
└── Adicionais  (NOVO — nova aba/seção)
    └── Lista de todos os grupos globais do estabelecimento
        ├── Criar grupo global (sem categoria)
        ├── Editar grupo global
        ├── Gerenciar itens do grupo
        └── Ver quais categorias usam este grupo (badge)
```

## Arquivos a Criar/Modificar

### Banco de Dados (migração)
- Criar tabela `category_addon_groups`
- Tornar `category_id` nullable em `addon_groups` (para grupos globais)
- Adicionar RLS policies na nova tabela
- Criar índices de performance

### Novos Arquivos Frontend
- `src/hooks/useGlobalAddonGroups.ts` — hooks para CRUD de grupos globais (sem `category_id`)
- `src/components/catalogo/GlobalAddonGroupManager.tsx` — seção "Adicionais" com lista de grupos globais
- `src/components/catalogo/CategoryAddonLinkManager.tsx` — componente dentro de cada categoria para vincular/desvincular grupos globais

### Arquivos Modificados
- `src/hooks/usePublicAddons.ts` — buscar grupos vinculados via `category_addon_groups` além dos diretos
- `src/hooks/useAddons.ts` — `AddonGroup.category_id` passa a ser `string | null`
- Página do Catálogo — adicionar aba/seção "Adicionais" após "Categorias"
- `src/components/catalogo/AddonGroupManager.tsx` — dentro de cada categoria, adicionar seção de vínculos com grupos globais

## Detalhes Técnicos de Implementação

### RLS para category_addon_groups
```sql
-- Apenas membros/donos do estabelecimento da categoria podem gerenciar vínculos
CREATE POLICY "Members can manage category addon links"
  ON category_addon_groups FOR ALL
  USING (EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = category_addon_groups.category_id
      AND (is_establishment_owner(auth.uid(), c.establishment_id)
           OR is_establishment_member(auth.uid(), c.establishment_id))
  ));
-- Leitura pública para a loja funcionar
CREATE POLICY "Anyone can view category addon links"
  ON category_addon_groups FOR SELECT USING (true);
```

### Grupos Globais vs. Grupos de Categoria

| Característica | Grupo de Categoria (atual) | Grupo Global (novo) |
|---|---|---|
| `category_id` | preenchido | NULL |
| Visível na seção "Adicionais" | Não | Sim |
| Visível na categoria | Sim (direto) | Sim (via vínculo) |
| Pode ser reutilizado | Não | Sim (N categorias) |
| Açaí da Jana - dados existentes | Intactos | — |

### Atualização da Loja Pública
```typescript
// usePublicAddonsForCategory — nova lógica
const directGroups = supabase.from("addon_groups")
  .select("*").eq("category_id", categoryId).eq("active", true);

const linkedGroups = supabase.from("category_addon_groups")
  .select("addon_groups!inner(*)")
  .eq("category_id", categoryId)
  .eq("addon_groups.active", true);
// Unir resultados, deduplicar por id
```

## O Que NÃO Muda
- Dados existentes da Açaí da Jana e demais estabelecimentos — intactos
- A loja pública continua funcionando com grupos vinculados diretamente à categoria
- O `AddonGroupManager` dentro de cada categoria continua igual para grupos diretos
- A forma como os adicionais aparecem no modal de produto para o cliente — idêntica

## Arquivos Modificados
- **Migração SQL** — nova tabela `category_addon_groups`, `category_id` nullable em `addon_groups`
- `src/hooks/useAddons.ts` — tipo `AddonGroup.category_id: string | null`
- `src/hooks/usePublicAddons.ts` — busca grupos via vínculo também
- `src/hooks/useGlobalAddonGroups.ts` — novo hook para grupos globais
- `src/components/catalogo/GlobalAddonGroupManager.tsx` — novo componente
- `src/components/catalogo/CategoryAddonLinkManager.tsx` — novo componente
- Página Catálogo — nova seção/aba "Adicionais"
