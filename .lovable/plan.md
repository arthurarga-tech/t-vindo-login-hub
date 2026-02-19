
# Impressao Silenciosa via RawBT

## O que sera feito

Adicionar 2 novas opcoes de impressao automatica silenciosa via aplicativo RawBT no Android, alem das opcoes existentes de impressao pelo navegador:

1. **RawBT ao receber pedido** - imprime automaticamente e silenciosamente quando um novo pedido chega
2. **RawBT ao confirmar pedido** - imprime silenciosamente quando o operador confirma o pedido

A diferenca das opcoes atuais (navegador) e que o RawBT imprime **sem abrir dialogo de impressao** - o pedido vai direto para a impressora termica conectada via Bluetooth/USB.

## Como funciona o RawBT

O aplicativo RawBT no Android intercepta URLs com o esquema `rawbt:base64,...`. Ao navegar para essa URL, o app captura o HTML codificado em Base64 e envia diretamente para a impressora termica, sem interacao do usuario.

## Mudancas Tecnicas

### 1. Atualizar tipo `PrintMode` em `Configuracoes.tsx`
- Adicionar `"rawbt_on_order"` e `"rawbt_on_confirm"` ao tipo `PrintMode`
- Adicionar 2 novos RadioGroup items na secao de impressao

### 2. Atualizar `usePrintSettings.ts`
- Adicionar flags `isRawbtOnOrder` e `isRawbtOnConfirm`
- Manter compatibilidade com as flags existentes `isPrintOnOrder` e `isPrintOnConfirm`

### 3. Adicionar funcao `printViaRawbt` em `usePrintOrder.ts`
- Gera o HTML do recibo
- Converte para Base64
- Navega para `rawbt:base64,<html-base64>` usando `window.location.href`
- Nao abre popup nem dialogo - impressao silenciosa

### 4. Atualizar `Pedidos.tsx`
- No `useEffect` de novos pedidos: se `isRawbtOnOrder`, chamar `printViaRawbt` ao inves de `printOrder`
- No `handleQuickConfirmPrint`: se `isRawbtOnConfirm`, chamar `printViaRawbt` e nao abrir `window.open()`

### 5. Atualizar `OrderList.tsx` e `OrderKanban.tsx`
- Quando o modo e RawBT ao confirmar, nao pre-abrir `window.open()` (nao e necessario para RawBT)

### Arquivos a modificar:
- `src/hooks/usePrintSettings.ts` - novas flags RawBT
- `src/hooks/usePrintOrder.ts` - nova funcao `printViaRawbt`
- `src/pages/dashboard/Configuracoes.tsx` - novas opcoes no RadioGroup
- `src/pages/dashboard/Pedidos.tsx` - logica condicional RawBT vs browser
- `src/components/pedidos/OrderList.tsx` - condicional para nao pre-abrir window
- `src/components/pedidos/OrderKanban.tsx` - condicional para nao pre-abrir window
