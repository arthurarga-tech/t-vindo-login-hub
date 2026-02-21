
# Correção de Bugs: Nome de Clientes em Pedidos Rapidos + Edição de Pagamento

## Problema 1: Nomes de clientes sendo sobrescritos

### Causa raiz
A função `create_or_update_public_customer` no banco de dados busca clientes pelo par `(phone, establishment_id)`. Quando o telefone é vazio (`""`), ela encontra o **primeiro** cliente sem telefone daquele estabelecimento e **sobrescreve o nome** dele com o nome do novo pedido.

Exemplo: "João" faz pedido balcão sem telefone, cliente criado com `phone=""`. Depois "Maria" faz outro pedido balcão sem telefone, a função encontra o registro de "João" (mesmo `phone=""`) e renomeia para "Maria".

### Solução
Alterar a função `create_or_update_public_customer` no banco para que, quando o telefone for vazio ou nulo, **sempre crie um novo cliente** ao invés de tentar atualizar um existente. A lógica de upsert por telefone só faz sentido quando o telefone de fato identifica alguém.

```sql
-- Se phone for vazio/nulo -> sempre INSERT novo cliente
-- Se phone preenchido -> comportamento atual (busca e atualiza ou cria)
```

Isso corrige tanto a impressão (que usa o nome do customer vinculado ao pedido) quanto o registro correto em clientes.

---

## Problema 2: Editar forma de pagamento no pedido aberto

### Estado atual
O `OrderDetailModal` exibe a forma de pagamento mas **não permite editá-la**. É apenas texto estático. O financeiro registra a transação quando o status muda para finalizado (delivered/picked_up/served), usando o `payment_method` do pedido nesse momento.

### Solução
Adicionar um botão de edição ao lado da forma de pagamento no `OrderDetailModal`, que abre um seletor inline. Ao trocar:

1. Atualiza `orders.payment_method` no banco
2. Se o pedido **já tiver** uma transação financeira (já foi finalizado), atualiza também a `financial_transactions` correspondente recalculando a taxa conforme o novo método (crédito/débito tem taxas diferentes)
3. Se o pedido ainda não foi finalizado, basta atualizar o campo no pedido -- o trigger `log_order_as_transaction` usará o método correto quando finalizar

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Alterar `create_or_update_public_customer` para ignorar upsert quando phone vazio |
| `src/components/pedidos/OrderDetailModal.tsx` | Adicionar edição inline da forma de pagamento |
| `src/hooks/useOrders.ts` | Adicionar mutation `useUpdateOrderPaymentMethod` |

---

## Detalhes Tecnicos

### Migration: fix create_or_update_public_customer

A funcao sera alterada para:
- Se `p_phone` for `NULL`, vazio `""` ou somente espacos: sempre INSERT novo cliente (nunca busca por phone vazio)
- Se `p_phone` tiver valor real: comportamento atual (busca existente, atualiza ou cria)

### useUpdateOrderPaymentMethod (novo hook)

```typescript
// Atualiza payment_method no pedido
// Se ja existe financial_transaction vinculada, recalcula fees e atualiza
```

Logica:
1. `UPDATE orders SET payment_method = X WHERE id = Y`
2. Busca `financial_transactions WHERE order_id = Y`
3. Se existir, recalcula `fee_amount` e `net_amount` baseado nas taxas do estabelecimento para o novo metodo
4. `UPDATE financial_transactions SET payment_method, fee_amount, net_amount`

### OrderDetailModal: edição de pagamento

- Botao de lapis ao lado da forma de pagamento (visivel apenas para pedidos nao cancelados)
- Ao clicar, mostra grid 2x2 com as opcoes de pagamento habilitadas do estabelecimento
- Ao selecionar, salva imediatamente e mostra toast de confirmacao
- O componente precisara receber as props de pagamento habilitado (`paymentPixEnabled`, etc.) do estabelecimento
