

# Refatoracao Completa: Mesas como Entidade Independente

## Visao Geral

Transformar o sistema atual (onde Mesa = Pedido com flags) em um modelo profissional onde Mesa e uma entidade independente que agrega multiplos pedidos, cada pedido e imutavel apos confirmacao, e itens possuem status individual de preparo.

---

## 1. Novas Tabelas no Banco de Dados

### Tabela `tables` (Mesas)

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| establishment_id | uuid FK | Estabelecimento |
| table_number | text | Numero da mesa |
| customer_id | uuid FK | Cliente vinculado |
| customer_display_name | text | Nome para exibicao |
| status | text | open, closing, closed |
| opened_at | timestamptz | Hora de abertura |
| closed_at | timestamptz | Hora de fechamento |
| notes | text | Observacoes |

### Tabela `table_payments` (Pagamentos multiplos no fechamento)

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| table_id | uuid FK | Mesa |
| payment_method | text | pix, credit, debit, cash |
| amount | numeric | Valor pago neste metodo |
| created_at | timestamptz | Data |

### Alteracoes na tabela `orders`

- Adicionar coluna `table_id uuid` (FK para tables, nullable)
- O campo `is_open_tab` continua existindo para compatibilidade, mas novos pedidos de mesa usarao `table_id`

### Alteracoes na tabela `order_items`

- Adicionar coluna `item_status text DEFAULT 'pending'` com valores: pending, preparing, ready, delivered

### Politicas RLS

- `tables`: Members/owners do establishment podem CRUD
- `table_payments`: Members/owners do establishment podem CRUD
- Realtime habilitado para `tables` e `order_items`

---

## 2. Regras de Negocio (Banco)

### Trigger: Pedido imutavel apos confirmacao
- Criar trigger `prevent_confirmed_order_edit` na tabela `order_items` que bloqueia INSERT/UPDATE/DELETE quando o pedido vinculado tem status diferente de `pending`
- Excecao: atualizacao do campo `item_status` (permitido para avancar status dos itens)

### Funcao: Verificar finalizacao automatica de pedido
- Trigger `check_order_completion` em `order_items` AFTER UPDATE
- Quando todos os itens de um pedido estiverem com `item_status = 'delivered'`, o pedido automaticamente muda para o status final (served)

### Funcao: Fechar mesa com multiplos pagamentos
- `close_table(p_table_id, p_payments jsonb)`
- Valida que soma dos pagamentos = total consumido
- Registra cada pagamento em `table_payments`
- Marca mesa como `closed`
- Para cada pedido da mesa: marca como `served` se nao estiver ja finalizado
- Cria transacoes financeiras separadas por metodo de pagamento (com taxas corretas)

---

## 3. Fluxo de Operacao (Novo Modelo)

```text
[Abrir Mesa]
     |
     v
  Mesa (status: open)
     |
     +--> Pedido #1 (criado, impresso)
     |       |
     |       +--> Item A (pending -> preparing -> ready -> delivered)
     |       +--> Item B (pending -> preparing -> ready -> delivered)
     |
     +--> Pedido #2 (cliente pediu mais, novo pedido, impresso)
     |       |
     |       +--> Item C (pending -> preparing -> ready -> delivered)
     |
     +--> [Fechar Mesa]
              |
              +--> Selecionar formas de pagamento (multiplas)
              +--> Validar total = total consumido
              +--> Registrar no financeiro
              +--> Mesa fechada
```

---

## 4. Alteracoes no Frontend

### Pagina de Mesas (`src/pages/dashboard/Mesas.tsx`)
- Buscar entidade `tables` ao inves de `orders` com `is_open_tab`
- Cada card de mesa mostra: numero, cliente, lista de pedidos com contagem de itens, total acumulado
- Botao "Adicionar Pedido" cria um NOVO pedido vinculado a mesa (nao edita pedidos existentes)

### Novo Hook `useTables`
- Query para mesas abertas com pedidos e itens aninhados
- Realtime subscription para `tables` e `orders` (com filter por establishment)

### Novo Hook `useCreateTableOrder`
- Cria novo pedido vinculado a uma mesa existente
- Imprime APENAS o novo pedido (nunca os anteriores)

### TableCard (refatorado)
- Mostra quantidade de pedidos e total acumulado
- Badge com contagem de itens por status (ex: "3 preparando, 2 prontos")

### CloseTabModal (refatorado para `CloseTableModal`)
- Lista todos os pedidos da mesa com subtotais
- Mostra total acumulado
- Interface para adicionar multiplas formas de pagamento
- Campo de valor para cada forma selecionada
- Validacao: total pago deve ser igual ao total consumido
- Feedback visual do saldo restante

### OrderDetailModal
- Quando pedido esta confirmado ou adiante: campos de itens sao somente leitura
- Exibir `item_status` por item com badge colorido
- Botoes para avancar status individual do item (pending -> preparing -> ready -> delivered)

### Kanban (`OrderKanban.tsx`)
- Adicionar identificacao visual clara no OrderCard:
  - Pedidos de mesa: badge "Mesa X" com icone de mesa
  - Pedidos de delivery: badge "Entrega" com icone de caminhao
  - Pedidos de retirada: badge "Retirada" com icone de pacote
- Funciona com pedidos individuais (cada pedido da mesa aparece separadamente no kanban)

### Impressao
- Imprimir APENAS no momento da criacao do pedido
- Cada novo pedido de mesa imprime somente seus itens, nunca os de pedidos anteriores
- Header do recibo inclui "MESA X - Pedido #N"

---

## 5. Migracao de Dados Legados

Script SQL para converter dados existentes:
1. Para cada `order` com `order_subtype = 'table'` e `is_open_tab = true`:
   - Criar registro em `tables` com status `open`
   - Setar `table_id` no pedido
2. Para mesas ja fechadas (`is_open_tab = false`, `order_subtype = 'table'`):
   - Criar registro em `tables` com status `closed`
   - Setar `table_id` no pedido
3. Todos os `order_items` existentes recebem `item_status = 'delivered'` (para pedidos finalizados) ou `'pending'` (para pedidos ativos)

---

## 6. Arquivos a Criar/Modificar

### Novos arquivos
| Arquivo | Descricao |
|---|---|
| Migration SQL | Tabelas tables, table_payments, colunas, triggers, funcoes, migracao |
| `src/hooks/useTables.ts` | Query + realtime para mesas |
| `src/hooks/useCreateTableOrder.ts` | Mutation para novo pedido em mesa existente |
| `src/hooks/useCloseTable.ts` | Mutation para fechar mesa com multiplos pagamentos |
| `src/hooks/useItemStatus.ts` | Mutation para atualizar item_status |
| `src/components/mesas/CloseTableModal.tsx` | Modal de fechamento com multiplos pagamentos |

### Arquivos modificados
| Arquivo | Descricao |
|---|---|
| `src/pages/dashboard/Mesas.tsx` | Usar useTables ao inves de useOpenTables |
| `src/components/mesas/TableCard.tsx` | Mostrar info agregada de multiplos pedidos |
| `src/components/pedidos/OrderCard.tsx` | Badge visual "Mesa X" / "Entrega" / "Retirada" |
| `src/components/pedidos/OrderDetailModal.tsx` | Status por item, bloqueio de edicao apos confirmacao |
| `src/components/pedidos/OrderKanban.tsx` | Sem mudanca estrutural (ja trabalha com pedidos individuais) |
| `src/hooks/useQuickOrder.ts` | Criar mesa + primeiro pedido ao abrir mesa |
| `src/hooks/useOpenTables.ts` | Deprecar ou redirecionar para useTables |
| `src/lib/orderStatus.ts` | Adicionar item status types e configs |
| `src/hooks/usePrintOrder.ts` | Garantir que so imprime o pedido atual |
| `src/integrations/supabase/types.ts` | Auto-gerado apos migration |

---

## 7. O Que NAO Muda

- Pedidos de delivery e retirada funcionam exatamente como hoje
- Kanban continua mostrando pedidos individuais
- Status flow de pedidos (pending -> confirmed -> preparing -> ...) permanece
- Impressao de pedidos de delivery/retirada sem alteracao
- Modulo financeiro: apenas o metodo de registro muda para mesas (multiplos pagamentos)

---

## 8. Compatibilidade e Seguranca

- Mesas antigas (com modelo `is_open_tab`) serao migradas automaticamente
- Campos legados (`is_open_tab`, `order_subtype`, `table_number` na tabela orders) permanecem para compatibilidade
- RLS policies seguem o mesmo padrao existente (is_establishment_member/owner)
- Trigger de imutabilidade protege integridade dos pedidos confirmados

