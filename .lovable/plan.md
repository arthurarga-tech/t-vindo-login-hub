

# Estrategia Melhorada para Clientes sem Telefone

## Problema Atual

Todos os pedidos sem telefone (balcao, mesa) sao vinculados a um unico registro "Balcao" por estabelecimento. Isso causa:

- **Estatisticas infladas**: O cliente "Balcao" do Acai da Jana tem 82 pedidos e soma todo o faturamento de balcao
- **Perda de identidade**: Nao se sabe quem e "Fabi", "Maria", "Joao" — tudo vira "Balcao"
- **Lista de clientes poluida**: Um registro gigante que nao representa ninguem de verdade
- **Impossivel rastrear recorrencia**: Se a mesma pessoa volta ao balcao sem telefone, nao ha como saber

## Estrategia Proposta: Cliente Opcional

A abordagem profissional usada em ERPs de restaurante:

**Pedido sem telefone = pedido anonimo. Nao cria registro de cliente.**

- O campo `customer_id` na tabela `orders` passa a ser **nullable**
- O nome digitado e salvo apenas em `customer_display_name` no pedido
- Registro de cliente so e criado quando o telefone e informado (permite CRM real)
- O registro "Balcao" e eliminado — nao tem mais sentido

### Logica de decisao:

```text
Telefone informado?
  SIM → Cria/atualiza cliente (upsert por phone+establishment)
       → Vincula customer_id ao pedido
       → CRM funcional: historico, recorrencia, stats
  NAO → Nao cria cliente
       → customer_id = NULL
       → Nome salvo em customer_display_name
       → Pedido funciona normalmente, sem poluir base de clientes
```

### Por que isso e melhor:

1. **Base de clientes limpa** — so clientes reais (com telefone) aparecem na lista
2. **Estatisticas precisas** — cada cliente tem historico real
3. **Sem registro fantasma** — nenhum "Balcao" com 82 pedidos
4. **Compativel com o modelo ERP de mesas** — mesas ja usam `customer_display_name`
5. **Pedidos anonimos continuam funcionando** — nome aparece no pedido, Kanban, impressao

---

## Implementacao

### 1. Migration SQL

**a) Tornar `customer_id` nullable na tabela `orders`:**

```sql
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
```

**b) Tornar `customer_id` nullable na tabela `tables`:**

Ja e nullable — sem mudanca necessaria.

**c) Atualizar `create_or_update_public_customer`:**

Quando nao ha telefone, retornar NULL ao inves de criar/buscar o "Balcao".

**d) Atualizar `create_public_order`:**

Aceitar `p_customer_id` como NULL.

**e) Atualizar `create_table_order`:**

Funcionar mesmo quando `customer_id` da mesa e NULL.

**f) Atualizar `delete_customer_cascade`:**

Pedidos com `customer_id = NULL` nao sao afetados (ja e o caso).

**g) Atualizar `log_order_as_transaction`:**

Nao depende de customer_id — sem mudanca.

**h) Atualizar `close_table`:**

Nao depende de customer_id — sem mudanca.

**i) Atualizar `get_customers_with_stats` e `get_customer_stats_summary`:**

Sem mudanca — ja filtram por establishment_id.

**j) Migrar dados legados:**

- Pedidos vinculados ao cliente "Balcao": setar `customer_display_name` com o nome salvo (ja feito anteriormente) e setar `customer_id = NULL`
- Deletar os registros "Balcao" de cada estabelecimento

### 2. Frontend

**`src/hooks/useQuickOrder.ts`:**

- Quando phone esta vazio: nao chamar `create_or_update_public_customer`, passar `null` como customer_id
- Quando phone esta preenchido: manter logica atual

**`src/hooks/useOrders.ts` (tipo Order):**

- `customer` passa a ser `customer | null`

**`src/components/pedidos/OrderCard.tsx`:**

- Usar `order.customer_display_name || order.customer?.name || "Cliente"` (ja faz isso parcialmente)
- Esconder telefone quando `order.customer` e null

**`src/components/pedidos/OrderDetailModal.tsx`:**

- Tratar `order.customer` como possivelmente null
- Mostrar apenas `customer_display_name` quando nao ha customer vinculado

**`src/hooks/useCreateTableOrder.ts`:**

- Funcionar com `customer_id = null` na mesa

**`src/components/loja/CheckoutForm.tsx`:**

- Nao muda — loja publica sempre exige telefone

### 3. Impacto Zero

- **Loja publica**: Sempre exige telefone → sempre cria cliente → sem mudanca
- **Delivery (dashboard)**: Sempre exige telefone → sem mudanca
- **Kanban**: Ja usa `customer_display_name || customer?.name` → funciona
- **Impressao**: Ja usa `customer_display_name` → funciona
- **Financeiro**: Nao depende de customer_id → funciona
- **Fechamento de mesa**: Nao depende de customer_id → funciona

### 4. Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| Migration SQL | `customer_id` nullable, atualizar RPCs, migrar dados |
| `src/hooks/useQuickOrder.ts` | Pular criacao de cliente quando sem telefone |
| `src/hooks/useOrders.ts` | Tipo `customer` como opcional |
| `src/components/pedidos/OrderCard.tsx` | Safe access a `order.customer` |
| `src/components/pedidos/OrderDetailModal.tsx` | Safe access a `order.customer` |
| `src/hooks/useCreateTableOrder.ts` | Suportar `customer_id = null` |
| `src/pages/dashboard/Configuracoes.tsx` | Preview de impressao: customer pode ser null |

