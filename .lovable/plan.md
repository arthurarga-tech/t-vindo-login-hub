
# Migração de Grupos Diretos para Grupos Globais

## Situação Atual

Existem **19 grupos de adicionais diretos** (com `category_id` preenchido) distribuídos em 3 estabelecimentos:

| Estabelecimento | Grupos Diretos | Categorias |
|---|---|---|
| Açaí da Jana | 13 | 4 (Açaí, Açaí 1KG, Milk shake, Bebidas) |
| Dom Burguer | 5 | 3 |
| LosHermAnos | 1 | 1 |

A tabela `category_addon_groups` (a de vínculos globais) está **completamente vazia** — nenhum grupo global existe ainda.

## Estratégia: Migração em 2 Fases, Sem Remover Nada Agora

### Fase 1 — Migração de Dados via SQL (esta implementação)

Para cada grupo de adicional direto existente:
1. Criar um **novo grupo global** (com `category_id = NULL`) com os mesmos dados (nome, min/max, required, active, order_position, establishment_id)
2. Copiar todos os **addons** do grupo direto para o novo grupo global
3. Criar um **link** em `category_addon_groups` apontando o novo grupo global para a mesma categoria do grupo original
4. Os grupos diretos originais **permanecem intactos** — a loja da Açaí da Jana continua funcionando exatamente como antes, pois `usePublicAddonsForCategory` já faz o UNION entre grupos diretos e grupos globais vinculados

### Fase 2 — O que NÃO acontece nesta implementação (será feito quando você confirmar)
- Os grupos diretos originais **não serão excluídos** ainda
- O `AddonGroupManager` (aba "Adicionais Diretos") **não será removido** ainda
- Quando você verificar que tudo está funcionando na loja pública, você nos avisará para fazer a limpeza

## O Que Esta Implementação Faz

### 1. Migration SQL de dados

Uma migration de dados que executa a cópia completa via SQL puro:

```sql
-- Para cada addon_group com category_id IS NOT NULL:
-- 1. Insere novo grupo global (category_id = NULL)
-- 2. Copia todos os addons do grupo original para o novo
-- 3. Cria o link em category_addon_groups
```

O script garante **idempotência**: verifica se já existe um link para o grupo naquela categoria antes de criar, evitando duplicatas se a migration rodar mais de uma vez.

### 2. Após a migration, o estado esperado no banco

Para a Açaí da Jana, por exemplo, a categoria "Açaí" terá:
- Grupos diretos existentes (category_id = 059acc5e...) — **intactos**
- Novos grupos globais (category_id = NULL) — **cópias globais**
- Links em category_addon_groups — **vinculando os globais à categoria**

No dashboard, na aba "Grupos Globais" da categoria "Açaí", aparecerão os grupos migrados. Na aba "Adicionais Diretos", os grupos originais continuarão aparecendo.

Na loja pública, o cliente verá os adicionais — **mas eles aparecerão duplicados temporariamente** (direto + global). Por isso, a limpeza dos grupos diretos originais será o passo seguinte, após sua confirmação.

## Arquivos Modificados

- **Migration SQL** — cópia dos dados (grupos + addons + links)
- Nenhum arquivo de código front-end será alterado nesta fase

## Aviso Importante sobre Duplicatas Temporárias

Durante o período entre esta migração e a limpeza dos grupos diretos, **a loja pública mostrará os adicionais duplicados** para cada categoria que tiver grupos migrados. Isso é esperado e temporário. Por isso, o próximo passo imediatamente após esta migration deve ser:

1. Verificar no dashboard que os grupos globais apareceram corretamente
2. Verificar na loja da Açaí da Jana
3. Confirmar e pedir a limpeza (remoção dos grupos diretos + código legado)

## Sequência de Execução da Migration

```sql
DO $$
DECLARE
  v_group RECORD;
  v_new_group_id uuid;
BEGIN
  FOR v_group IN 
    SELECT * FROM addon_groups WHERE category_id IS NOT NULL
  LOOP
    -- Pula se já existe link (idempotente)
    IF EXISTS (
      SELECT 1 FROM category_addon_groups cag
      JOIN addon_groups ag2 ON ag2.id = cag.addon_group_id
      WHERE cag.category_id = v_group.category_id
        AND ag2.name = v_group.name
        AND ag2.category_id IS NULL
        AND ag2.establishment_id = v_group.establishment_id
    ) THEN CONTINUE; END IF;

    -- Cria o grupo global
    INSERT INTO addon_groups (establishment_id, name, min_selections, max_selections, required, active, order_position, category_id)
    VALUES (v_group.establishment_id, v_group.name, v_group.min_selections, v_group.max_selections, v_group.required, v_group.active, v_group.order_position, NULL)
    RETURNING id INTO v_new_group_id;

    -- Copia os addons
    INSERT INTO addons (addon_group_id, name, price, active, order_position)
    SELECT v_new_group_id, name, price, active, order_position
    FROM addons WHERE addon_group_id = v_group.id;

    -- Cria o link
    INSERT INTO category_addon_groups (category_id, addon_group_id)
    VALUES (v_group.category_id, v_new_group_id);
  END LOOP;
END $$;
```

## Arquivos Modificados

- `supabase/migrations/[timestamp]_migrate_direct_addons_to_global.sql` — migration de dados
