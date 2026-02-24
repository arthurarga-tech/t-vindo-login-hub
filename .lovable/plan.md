

# Analise Completa e Correcoes: Refatoracao de Mesas/Comandas

## Problemas Identificados

### Bug 1: Erro ao adicionar item depois da mesa ser aberta
**Causa raiz**: Em `Mesas.tsx` linha 34-41, o botao "Novo Pedido" na mesa tenta abrir o `OrderAddItemModal` para inserir itens no pedido existente. Porem, o pedido ja foi confirmado (status != "pending"), e o trigger `prevent_confirmed_order_edit` bloqueia o INSERT em `order_items`.

**Solucao**: Substituir a logica de "adicionar item ao pedido existente" por "criar um novo pedido vinculado a mesa". Isso segue o modelo ERP correto: cada novo pedido e imutavel apos confirmacao, e adicionar itens gera um novo pedido.

### Bug 2: Erro ao excluir cliente (Cannot modify items of a confirmed order)
**Causa raiz**: A funcao `delete_customer_cascade` executa `DELETE FROM order_items WHERE order_id IN (...)`. O trigger `prevent_confirmed_order_edit` intercepta esse DELETE e bloqueia porque os pedidos associados estao com status "served". O trigger nao diferencia entre uma edicao de usuario e uma exclusao administrativa em cascata.

**Solucao**: Alterar a funcao `delete_customer_cascade` para desabilitar temporariamente o trigger durante a operacao, ou usar uma abordagem que dropa e recria o trigger (complexo). A forma mais segura: desabilitar e reabilitar o trigger dentro da funcao SECURITY DEFINER.

### Melhoria 3: Impressao com "MESA X - Pedido #N"
**Causa raiz**: O `usePrintOrder.ts` ja exibe `table_number` quando presente, mas nao formata como "MESA X - Pedido #N" no header principal.

**Solucao**: Alterar `generateReceiptHtml` e `generateReceiptText` para exibir "MESA X - Pedido #N" quando o pedido pertence a uma mesa.

### Bug 4: Trigger log_order_as_transaction duplica lancamentos financeiros
**Causa raiz**: Quando `close_table` finaliza pedidos (muda status para "served"), o trigger `log_order_as_transaction` dispara e cria transacoes financeiras automaticas. Mas `close_table` JA registra transacoes financeiras por metodo de pagamento. Resultado: lancamentos duplicados.

**Solucao**: Modificar `log_order_as_transaction` para ignorar pedidos que pertencem a uma mesa (table_id IS NOT NULL), pois o financeiro sera gerido pelo `close_table`.

### Bug 5: handleAddOrder cria novo pedido mas nao tem modal adequado
**Causa raiz**: `Mesas.tsx` precisa de um fluxo para criar um novo pedido vinculado a mesa existente (com selecao de produtos), nao apenas adicionar item a pedido existente.

**Solucao**: Criar um modal/fluxo que usa `QuickOrderModal` pre-configurado para a mesa existente, ou criar um hook `useCreateTableOrder` dedicado.

---

## Plano de Implementacao

### 1. Migration SQL

```text
Arquivo: supabase/migrations/[timestamp]_fix_tables_refactor.sql
```

**a) Corrigir `delete_customer_cascade`** para desabilitar o trigger antes de deletar order_items:

```sql
CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_customer_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_establishment_id uuid;
BEGIN
  -- Verify caller is owner/member
  SELECT c.establishment_id INTO v_establishment_id
  FROM customers c WHERE c.id = p_customer_id
    AND (is_establishment_owner(auth.uid(), c.establishment_id) 
      OR is_establishment_member(auth.uid(), c.establishment_id));

  IF v_establishment_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized or customer not found';
  END IF;

  -- Temporarily disable the immutability trigger
  ALTER TABLE order_items DISABLE TRIGGER prevent_confirmed_order_edit;

  -- Delete financial transactions
  DELETE FROM financial_transactions
  WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- Delete order item addons
  DELETE FROM order_item_addons
  WHERE order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.customer_id = p_customer_id
  );

  -- Delete order items (now allowed without trigger)
  DELETE FROM order_items
  WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- Re-enable the trigger
  ALTER TABLE order_items ENABLE TRIGGER prevent_confirmed_order_edit;

  -- Delete order status history
  DELETE FROM order_status_history
  WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- Delete orders
  DELETE FROM orders WHERE customer_id = p_customer_id;

  -- Delete customer
  DELETE FROM customers WHERE id = p_customer_id;
END;
$$;
```

**b) Corrigir `log_order_as_transaction`** para ignorar pedidos de mesa:

```sql
-- Adicionar no inicio da funcao, apos verificar status:
-- Se o pedido pertence a uma mesa, pular (close_table gerencia o financeiro)
IF NEW.table_id IS NOT NULL THEN
  RETURN NEW;
END IF;
```

**c) Criar funcao `create_table_order`** para criar novo pedido vinculado a mesa existente:

```sql
CREATE OR REPLACE FUNCTION public.create_table_order(
  p_table_id uuid,
  p_items jsonb
) RETURNS json ...
-- Cria um novo pedido com payment_method='pending', order_type='dine_in',
-- vinculado a mesa existente, insere items e addons
```

### 2. Frontend - Corrigir fluxo "Novo Pedido" na mesa

**Arquivo**: `src/hooks/useCreateTableOrder.ts` (novo)

Hook que:
- Recebe table_id e lista de itens
- Cria novo pedido via RPC ou diretamente, vinculado a mesa
- Usa payment_method='pending' (sera definido no fechamento)
- Imprime apenas o novo pedido

**Arquivo**: `src/components/mesas/TableAddOrderModal.tsx` (novo)

Modal que:
- Mostra selector de produtos (reutiliza `ProductSelector`)
- Permite adicionar multiplos itens
- Confirma e cria novo pedido via `useCreateTableOrder`
- Imprime automaticamente o novo pedido

**Arquivo**: `src/pages/dashboard/Mesas.tsx` (modificar)

- Substituir `OrderAddItemModal` por `TableAddOrderModal`
- Passar `table` ao inves de `order`

### 3. Frontend - Impressao com "MESA X - Pedido #N"

**Arquivo**: `src/hooks/usePrintOrder.ts` (modificar)

- Em `generateReceiptHtml`: quando `order.table_id` ou `order.table_number` existe, alterar o header de `PEDIDO #N` para `MESA X - PEDIDO #N`
- Em `generateReceiptText`: mesma logica para o recibo texto (RawBT)

### 4. Frontend - Melhorias no TableCard e detalhe

**Arquivo**: `src/pages/dashboard/Mesas.tsx`

- Ao clicar na mesa, mostrar lista de todos os pedidos da mesa (nao apenas o mais recente)
- Permitir navegar entre pedidos da mesa

---

## Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `supabase/migrations/[timestamp].sql` | Fix delete_customer_cascade, log_order_as_transaction, create_table_order |
| `src/hooks/useCreateTableOrder.ts` | Hook para criar novo pedido em mesa existente |
| `src/components/mesas/TableAddOrderModal.tsx` | Modal de adicao de pedido a mesa |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/dashboard/Mesas.tsx` | Usar TableAddOrderModal ao inves de OrderAddItemModal |
| `src/hooks/usePrintOrder.ts` | Header "MESA X - Pedido #N" |
| `src/integrations/supabase/types.ts` | Auto-atualizado |

## Impacto

- **Pedidos de delivery/retirada**: sem alteracao
- **Kanban**: sem alteracao (ja mostra pedidos individuais)
- **Financeiro**: corrigido para nao duplicar lancamentos de mesa
- **Exclusao de clientes**: corrigido para funcionar com pedidos confirmados
- **Impressao**: atualizada com identificacao de mesa

