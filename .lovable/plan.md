

# Plano: Múltiplos Fluxos de Pedido (Balcão e Mesa) + Página Mesas/Comandas

## Visão Geral

Este plano implementa:
1. **Nova página "Mesas/Comandas"** no menu lateral do dashboard
2. **Fluxos distintos** no modal "Novo Pedido": Balcão e Mesa
3. **Registro de origem** dos clientes (delivery, balcão, mesa)
4. **Nova modalidade "Mesa"** em Meu Negócio

---

## Fluxo Visual Resumido

```text
NOVO PEDIDO (título simplificado)
    │
    ├─► BALCÃO
    │     │
    │     ├─ Nome do Cliente (obrigatório)
    │     ├─ Telefone (opcional)
    │     ├─ Produtos
    │     ├─ Pagamento (obrigatório)
    │     └─ CRIAR PEDIDO → status: ready_to_serve → Financeiro imediato
    │
    └─► MESA
          │
          ├─ Número da Mesa (obrigatório)
          ├─ Nome do Cliente (obrigatório)
          ├─ Telefone (opcional)
          ├─ Produtos
          └─ ABRIR COMANDA → status: pending → is_open_tab: true
                │
                ├─ [+ Adicionar Itens] (enquanto aberta)
                │
                └─ [Fechar Conta]
                      ├─ Seleciona pagamento
                      └─ Registra no Financeiro
```

---

## Etapa 1: Alterações no Banco de Dados

### Objetivo
Preparar a estrutura para suportar os novos fluxos.

### Mudanças

| Tabela | Campo | Tipo | Descrição |
|--------|-------|------|-----------|
| `customers` | `phone` | DROP NOT NULL | Permitir telefone vazio |
| `customers` | `order_origin` | text (novo) | Origem: 'delivery', 'counter', 'table' |
| `orders` | `order_subtype` | text (novo) | Subtipo: 'counter' ou 'table' |
| `orders` | `table_number` | text (novo) | Número da mesa (quando aplicável) |
| `orders` | `is_open_tab` | boolean (novo) | Comanda aberta (pode adicionar itens) |
| `establishments` | `service_table` | boolean (novo) | Habilitar modalidade Mesa |

### SQL Migration

```sql
-- 1. Tornar telefone opcional em customers
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN phone SET DEFAULT '';

-- 2. Adicionar origem do cliente
ALTER TABLE customers ADD COLUMN order_origin text DEFAULT 'delivery';

-- 3. Adicionar campos de mesa em orders
ALTER TABLE orders ADD COLUMN order_subtype text DEFAULT NULL;
ALTER TABLE orders ADD COLUMN table_number text DEFAULT NULL;
ALTER TABLE orders ADD COLUMN is_open_tab boolean DEFAULT false;

-- 4. Adicionar modalidade mesa em establishments
ALTER TABLE establishments ADD COLUMN service_table boolean DEFAULT false;
```

### Teste da Etapa 1
- Acessar Meu Negócio e verificar se a página carrega normalmente
- Criar um pedido via loja pública para garantir que nada quebrou

---

## Etapa 2: Adicionar Modalidade "Mesa" em Meu Negócio

### Objetivo
Permitir que estabelecimentos habilitem ou desabilitem o atendimento por mesas.

### Mudanças

**Arquivo:** `src/pages/dashboard/MeuNegocio.tsx`

- Adicionar novo state `serviceTable`
- Adicionar switch na seção "Modalidades de Atendimento"
- Incluir `service_table` na função `handleSave`

### Layout Visual

```text
┌─────────────────────────────────────────────────────┐
│ Modalidades de Atendimento                          │
├─────────────────────────────────────────────────────┤
│ 🚚 Delivery                          [  ON   ]      │
│ 📦 Retirada no Local                 [  OFF  ]      │
│ 🍽️ Comer no Local                    [  ON   ]      │
│ 🪑 Atendimento em Mesa               [  ON   ] ←NEW │
│    Permite criar pedidos por mesa/comanda           │
└─────────────────────────────────────────────────────┘
```

### Teste da Etapa 2
- Acessar Meu Negócio → Modalidades de Atendimento
- Verificar se o switch "Atendimento em Mesa" aparece
- Ativar e desativar, salvar e recarregar para confirmar persistência

---

## Etapa 3: Nova Página "Mesas/Comandas" no Menu Lateral

### Objetivo
Criar uma página dedicada para gerenciar pedidos de mesas.

### Mudanças

**Arquivo:** `src/components/dashboard/DashboardSidebar.tsx`

Adicionar novo item de menu após "Gestão de Pedidos":

```typescript
{ 
  title: "Mesas/Comandas", 
  url: "/dashboard/mesas", 
  icon: UtensilsCrossed, // ou LayoutGrid
  testId: "mesas" 
}
```

**Novo arquivo:** `src/pages/dashboard/Mesas.tsx`

Página dedicada com:
- Visualização de mesas abertas
- Botão para criar novo pedido de mesa
- Cards de mesas com status visual

### Comportamento do Menu

| `service_table` | Comportamento |
|-----------------|---------------|
| `true` | Link normal, navegável |
| `false` | Ícone diferente (LockKeyhole), clique abre tooltip/toast explicando que precisa ativar em Meu Negócio |

### Layout Visual do Menu

```text
📋 Gestão de Pedidos
🪑 Mesas/Comandas      ← Nova linha
💵 Financeiro
📖 Catálogo
...
```

### Teste da Etapa 3
- Verificar se o item "Mesas/Comandas" aparece no menu lateral
- Com modalidade desativada: verificar que mostra ícone bloqueado
- Com modalidade ativada: verificar que navega para a página

---

## Etapa 4: Modificar Modal "Novo Pedido" 

### 4.1 - Alterar Título

**Arquivo:** `src/components/pedidos/QuickOrderModal.tsx`

Mudar DialogTitle de "Novo Pedido - Balcão" para apenas "Novo Pedido"

### 4.2 - Novo Step: Seleção de Tipo

Adicionar passo inicial para escolher entre Balcão e Mesa:

```text
┌───────────────────────────────────────────────────┐
│                    Novo Pedido                    │
├───────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │   🛒 BALCÃO     │  │   🪑 MESA               │ │
│  │                 │  │                         │ │
│  │  Paga no ato    │  │  Paga no final          │ │
│  │                 │  │  + Nº da Mesa: [____]   │ │
│  └─────────────────┘  └─────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

- Se `service_table = false`: vai direto para Balcão (sem seleção)
- Se `service_table = true`: mostra seleção

### 4.3 - Fluxo Balcão

**Steps:** Tipo → Cliente → Produtos → Pagamento

| Campo | Obrigatório |
|-------|-------------|
| Nome do Cliente | ✅ Sim |
| Telefone | ❌ Não |
| Produtos | ✅ Sim |
| Pagamento | ✅ Sim |

- `order_subtype = 'counter'`
- `order_origin = 'counter'` no cliente
- Status: `ready_to_serve` (pronto para servir)
- Registro financeiro: imediato

### 4.4 - Fluxo Mesa

**Steps:** Tipo + Mesa → Cliente → Produtos (sem pagamento)

| Campo | Obrigatório |
|-------|-------------|
| Número da Mesa | ✅ Sim |
| Nome do Cliente | ✅ Sim |
| Telefone | ❌ Não |
| Produtos | ✅ Sim |
| Pagamento | ❌ No fechamento |

- `order_subtype = 'table'`
- `table_number = 'X'`
- `is_open_tab = true`
- `order_origin = 'table'` no cliente
- `payment_method = 'pending'` (placeholder)
- Status: `pending`
- Registro financeiro: NÃO (apenas no fechamento)

### Teste da Etapa 4
- Abrir modal "Novo Pedido" em Gestão de Pedidos
- Verificar título "Novo Pedido"
- Com modalidade mesa desativada: deve ir direto para fluxo balcão
- Com modalidade mesa ativada: deve mostrar seleção
- Criar pedido balcão sem telefone
- Criar pedido mesa com número

---

## Etapa 5: Modificar Hook useQuickOrder

### Objetivo
Suportar os novos campos e lógicas.

**Arquivo:** `src/hooks/useQuickOrder.ts`

### Mudanças

```typescript
interface QuickOrderData {
  // ... campos existentes
  orderSubtype: 'counter' | 'table';  // novo
  tableNumber?: string;                // novo
  orderOrigin: 'counter' | 'table';    // novo
}
```

- Atualizar chamada RPC para passar `order_origin`
- Passar novos campos para `create_public_order`
- Para mesa: não dispara transação financeira

### Teste da Etapa 5
- Criar pedido balcão e verificar que aparece em Gestão de Pedidos
- Verificar que pedido balcão aparece no Financeiro imediatamente
- Criar pedido mesa e verificar que NÃO aparece no Financeiro

---

## Etapa 6: Página Mesas/Comandas (Conteúdo)

### Objetivo
Implementar a visualização e gestão de mesas abertas.

**Arquivo:** `src/pages/dashboard/Mesas.tsx`

### Funcionalidades

1. **Lista de Mesas Abertas**
   - Cards com número da mesa, cliente, itens, total
   - Badge visual "Comanda Aberta"
   - Tempo desde abertura

2. **Ações por Mesa**
   - Ver detalhes
   - Adicionar itens
   - Fechar conta

3. **Botão "Nova Mesa"**
   - Abre modal de novo pedido já no modo Mesa

### Layout Visual

```text
┌─────────────────────────────────────────────────────┐
│ 🪑 Mesas/Comandas                    [+ Nova Mesa]  │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│ │ 🪑 Mesa 1    │  │ 🪑 Mesa 5    │  │ 🪑 Mesa 12 │  │
│ │ João         │  │ Maria        │  │ Pedro      │  │
│ │ 3 itens      │  │ 5 itens      │  │ 2 itens    │  │
│ │ R$ 87,00     │  │ R$ 142,00    │  │ R$ 45,00   │  │
│ │ 45min        │  │ 1h 20min     │  │ 15min      │  │
│ │              │  │              │  │            │  │
│ │ [+ Itens]    │  │ [+ Itens]    │  │ [+ Itens]  │  │
│ │ [Fechar]     │  │ [Fechar]     │  │ [Fechar]   │  │
│ └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Teste da Etapa 6
- Acessar página Mesas/Comandas
- Verificar que mesas abertas aparecem
- Verificar tempo decorrido

---

## Etapa 7: Adicionar Itens à Mesa Aberta

### Objetivo
Permitir adicionar produtos a uma comanda já aberta.

**Novo arquivo:** `src/components/pedidos/AddItemsToTableModal.tsx`

### Funcionalidades

- Recebe o `orderId` da mesa
- Lista de produtos (similar ao QuickOrderProductList)
- Ao confirmar: insere novos `order_items`
- Atualiza `subtotal` e `total` do pedido

### Teste da Etapa 7
- Abrir uma mesa e adicionar itens
- Verificar que total atualiza
- Verificar que novos itens aparecem nos detalhes

---

## Etapa 8: Fechar Conta da Mesa

### Objetivo
Finalizar comanda, definir pagamento e registrar no financeiro.

**Novo arquivo:** `src/components/pedidos/CloseTableBillModal.tsx`

### Funcionalidades

1. Exibir resumo de todos os itens
2. Exibir total
3. Seleção de forma de pagamento
4. Campo de troco (se dinheiro)
5. Botão "Confirmar Fechamento"

### Ao confirmar:
- Atualiza `payment_method`
- Atualiza `is_open_tab = false`
- Atualiza `status = 'served'`
- Trigger existente registra no Financeiro

### Teste da Etapa 8
- Fechar conta de uma mesa
- Selecionar pagamento
- Verificar que mesa some da lista de abertas
- Verificar que transação aparece no Financeiro

---

## Etapa 9: Coluna "Origem" em Clientes

### Objetivo
Mostrar de onde cada cliente veio.

**Arquivo:** `src/components/clientes/CustomerTable.tsx`

### Mudanças

Adicionar coluna "Origem" com badges:

| Valor | Badge | Cor |
|-------|-------|-----|
| `delivery` | 🚚 Delivery | Azul |
| `counter` | 🛒 Balcão | Verde |
| `table` | 🪑 Mesa | Laranja |

### Teste da Etapa 9
- Criar clientes via delivery, balcão e mesa
- Acessar página Clientes
- Verificar que badges de origem aparecem corretamente

---

## Resumo de Arquivos

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/DashboardSidebar.tsx` | Novo item menu "Mesas/Comandas" |
| `src/pages/dashboard/MeuNegocio.tsx` | Switch `service_table` |
| `src/components/pedidos/QuickOrderModal.tsx` | Seleção Balcão/Mesa, fluxos diferentes |
| `src/hooks/useQuickOrder.ts` | Novos campos e lógica |
| `src/components/clientes/CustomerTable.tsx` | Coluna origem |
| `src/App.tsx` | Nova rota `/dashboard/mesas` |

### Novos Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `src/pages/dashboard/Mesas.tsx` | Página de gestão de mesas |
| `src/components/pedidos/AddItemsToTableModal.tsx` | Adicionar itens à mesa |
| `src/components/pedidos/CloseTableBillModal.tsx` | Fechar conta da mesa |
| `src/hooks/useTableOrder.ts` | Hooks para operações de mesa |

---

## Sugestões Adicionais de Usabilidade

### Para estabelecimentos SEM mesa
- Menu "Mesas/Comandas" aparece com ícone de cadeado
- Tooltip: "Ative em Meu Negócio → Modalidades de Atendimento"
- Modal Novo Pedido vai direto para fluxo Balcão

### Para estabelecimentos COM mesa
- Podem usar ambos os fluxos (Balcão e Mesa)
- Mesas abertas destacadas visualmente
- Notificação sonora para mesas muito tempo abertas (futuro)

### Melhorias futuras possíveis
- Dashboard visual de mesas (layout do salão)
- Transferência de itens entre mesas
- Divisão de conta por pessoa
- Junção de mesas
- Tempo médio de permanência por mesa
- Relatórios de ocupação

---

## Ordem de Implementação

1. **Etapa 1** - Migrations de banco de dados
2. **Etapa 2** - Switch "Mesa" em Meu Negócio
3. **Etapa 3** - Item "Mesas/Comandas" no menu lateral (bloqueado)
4. **Etapa 4** - Modal "Novo Pedido" com seleção
5. **Etapa 5** - Hook useQuickOrder atualizado
6. **Etapa 6** - Página Mesas/Comandas funcional
7. **Etapa 7** - Adicionar itens à mesa
8. **Etapa 8** - Fechar conta da mesa
9. **Etapa 9** - Coluna origem em clientes

Cada etapa pode ser testada independentemente antes de prosseguir para a próxima.

