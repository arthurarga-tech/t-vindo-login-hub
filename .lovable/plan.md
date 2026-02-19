

# Fila de Impressao Inteligente e Opcao de Precos nos Adicionais

## Resumo

Tres melhorias na impressao automatica:
1. **Evitar impressao duplicada** usando localStorage para persistir IDs de pedidos ja impressos (sobrevive a refresh)
2. **Fila sequencial** para imprimir pedidos na ordem correta quando chegam simultaneamente
3. **Nova configuracao** para exibir ou ocultar precos dos adicionais em todas as modalidades de impressao

Os botoes manuais de impressao nao serao alterados.

## Mudancas Tecnicas

### 1. Novo campo no banco: `print_addon_prices` (boolean)

Adicionar coluna `print_addon_prices` na tabela `establishments` com default `true`.

### 2. Atualizar `usePrintSettings.ts`

- Adicionar campo `printAddonPrices: boolean` ao retorno
- Ler de `establishment?.print_addon_prices ?? true`

### 3. Atualizar `PrintOrderOptions` e funcoes de impressao em `usePrintOrder.ts`

- Adicionar `printAddonPrices?: boolean` na interface `PrintOrderOptions`
- Em `generateReceiptHtml`: condicionar exibicao do preco do addon ao flag
- Em `generateReceiptText` (RawBT): condicionar exibicao do preco do addon ao flag

### 4. Fila de impressao e anti-duplicata em `Pedidos.tsx`

- Substituir `printedOrdersRef` (Set em memoria) por leitura/escrita em `localStorage` com chave `auto_printed_orders`
  - Guardar array de IDs, limpar entradas com mais de 24h para nao crescer infinitamente
- Implementar fila sequencial: ao detectar novos pedidos pendentes, adiciona-los a uma fila e processar um de cada vez (aguardar o fetch + envio ao RawBT/browser antes de processar o proximo)
- Ordenar novos pedidos por `order_number` antes de enfileirar

### 5. Configuracoes UI em `Configuracoes.tsx`

- Adicionar estado `printAddonPrices` com Switch na secao de personalizacao do recibo
- Incluir no `handleSave`

### 6. Passar `printAddonPrices` em todos os locais que chamam impressao

- `Pedidos.tsx`: auto-print e `handlePrintOrder` e `handleQuickConfirmPrint`
- `OrderDetailModal`: impressao manual

### Arquivos a modificar

- `supabase/migrations/` - nova migracao para coluna `print_addon_prices`
- `src/hooks/usePrintSettings.ts` - novo campo
- `src/hooks/usePrintOrder.ts` - condicional de precos nos addons
- `src/pages/dashboard/Pedidos.tsx` - fila sequencial + localStorage anti-duplicata
- `src/pages/dashboard/Configuracoes.tsx` - novo switch na UI
- `src/components/pedidos/OrderDetailModal.tsx` - passar novo prop

