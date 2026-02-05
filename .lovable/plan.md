

# Correções e Ajustes nas Etapas 4-5

## Problemas Identificados

### Problema 1: Pedido balcão vai direto para "Prontos"
O hook `useQuickOrder.ts` define `status: "ready_to_serve"` para pedidos de balcão (linha 106). O correto é que o pedido siga o fluxo normal iniciando como `pending`.

**Correção:** Remover a atualização de status para `ready_to_serve` no hook. Pedidos de balcão devem iniciar como `pending` e seguir o fluxo: pendente > confirmado > preparando > pronto para servir > finalizado.

### Problema 2: "Erro ao criar pedido" para mesa
O erro no console mostra:
```
violates check constraint "orders_payment_method_check"
```
Existe uma constraint no banco que exige `payment_method IN ('cash', 'pix', 'credit', 'debit')`. Para pedidos de mesa, o código envia `"pending"` como payment_method, que não é um valor permitido.

**Correção:** Atualizar a constraint para aceitar `'pending'` como valor valido de payment_method. Isso permite que pedidos de mesa sejam criados sem pagamento definido.

### Problema 3: Reorganizar fluxo de criação de pedido de mesa

O usuario sugeriu (e faz mais sentido) que a **criacao de pedidos de mesa** aconteca na pagina **Mesas/Comandas**, e nao no modal "Novo Pedido" da pagina de Gestao de Pedidos. Os pedidos de mesa continuariam aparecendo em Gestao de Pedidos normalmente.

**Decisao:** Manter o modal "Novo Pedido" com a selecao Balcao/Mesa quando `service_table` esta ativado, mas tambem adicionar um botao "Nova Mesa" na pagina Mesas/Comandas que abre o mesmo modal ja pre-selecionando o modo Mesa. O botao "Novo Pedido" na pagina Pedidos continua funcionando para ambos os fluxos.

---

## Mudancas a Implementar

### 1. Migration: Adicionar 'pending' a constraint de payment_method

```sql
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('cash', 'pix', 'credit', 'debit', 'pending'));
```

### 2. Hook useQuickOrder.ts - Corrigir status de balcao

Remover as linhas que alteram o status para `ready_to_serve` (linhas 106 e 112-117). Pedidos de balcao devem ficar como `pending` e seguir o fluxo normal.

Antes:
```typescript
if (!isTable) {
  orderUpdate.status = "ready_to_serve";
}
// + insert status history for ready_to_serve
```

Depois:
```typescript
// Apenas define o subtype, sem alterar status
// Todos os pedidos iniciam como 'pending' (definido pelo RPC)
```

### 3. Pagina Mesas.tsx - Botao "Nova Mesa"

Adicionar um botao "Nova Mesa" que abre o `QuickOrderModal` com `defaultSubtype="table"`, pulando a etapa de selecao de tipo.

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| Nova migration SQL | Adicionar `'pending'` a constraint |
| `src/hooks/useQuickOrder.ts` | Remover mudanca de status para `ready_to_serve` |
| `src/pages/dashboard/Mesas.tsx` | Adicionar botao "Nova Mesa" com QuickOrderModal |

## Testes

1. **Balcao:** Criar pedido de balcao e verificar que inicia como "Pendente"
2. **Mesa:** Criar pedido de mesa e verificar que nao da erro
3. **Mesas/Comandas:** Verificar que botao "Nova Mesa" abre modal direto no modo mesa

