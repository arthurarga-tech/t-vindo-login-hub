

# Corrigir Impressao Mobile (Rawbt) - Plano por Etapas

## Problema

No mobile Android com Rawbt, a impressao nao funciona em nenhuma das 3 modalidades:
1. Clique manual no icone de impressora -- nao imprime o recibo correto
2. Imprimir ao receber pedido -- abre pagina errada/vazia
3. Imprimir ao confirmar -- mesma falha

A causa raiz e que o Android Chrome (e o Rawbt que intercepta o print dialog) tem restricoes rigorosas:
- `window.print()` chamado apos `await` ou `setTimeout` perde o contexto de gesto do usuario
- Iframes ocultos (`visibility: hidden`, `width: 0`) nao funcionam no mobile -- o Android imprime a pagina pai
- Auto-print disparado por `useEffect` (sem gesto direto do usuario) e bloqueado

## Solucao em 3 Etapas

### Etapa 1: Corrigir impressao manual (clique no icone)

**Arquivo:** `src/hooks/usePrintOrder.ts`

Reescrever o metodo `printOrder` para ser mais direto e compativel com mobile:
- Usar `window.open()` com o HTML completo ja escrito
- Chamar `window.print()` de forma sincrona, sem `await` intermediario
- Eliminar o `await new Promise(resolve => setTimeout(resolve, 300))` que quebra o gesto
- Para logos, usar `onload` do window ao inves de polling manual de imagens
- Manter iframe como fallback para desktop com popup bloqueado, mas com `opacity: 0` e dimensoes reais (`width: 58mm`)

**Arquivo:** `src/pages/dashboard/Configuracoes.tsx`

Corrigir o botao "Imprimir Teste" que usa iframe oculto com `visibility: hidden` e `width: 0`:
- Trocar para usar `window.open()` igual ao metodo principal
- Garantir consistencia: todos os pontos de impressao usam o mesmo caminho

### Etapa 2: Corrigir auto-impressao ao receber pedido

**Arquivo:** `src/pages/dashboard/Pedidos.tsx`

O auto-print dispara dentro de um `useEffect` + `forEach(async ...)` com `await setTimeout` de 1500ms. Isso nao tem gesto do usuario.

Solucao: Quando `isPrintOnOrder` esta ativo e chega um novo pedido:
- Em vez de chamar `printOrder()` diretamente (que abre print dialog sem gesto), mostrar um **toast interativo** com botao "Imprimir" que o usuario clica
- Isso mantem o gesto do usuario direto no `onClick` do botao
- Alternativa: navegar o usuario para uma pagina de impressao dedicada

A logica de buscar o pedido fresco com items/addons continua, mas a chamada `printOrder` so acontece quando o usuario clica no toast.

### Etapa 3: Corrigir impressao ao confirmar pedido

**Arquivo:** `src/components/pedidos/OrderDetailModal.tsx`

No `handleStatusChange`, apos `await updateStatus.mutateAsync(...)`, chama `handlePrint()`. O problema e que o `await` anterior quebra o contexto de gesto.

Solucao:
- Disparar a impressao **antes** de esperar a mutacao, ou usar uma estrategia de dois passos
- Melhor abordagem: abrir a janela de impressao imediatamente no click (reservando o `window.open`), depois preencher o conteudo apos a mutacao completar

**Arquivos:** `src/components/pedidos/OrderKanban.tsx` e `src/components/pedidos/OrderList.tsx`

O quick confirm tambem chama `onQuickConfirmPrint` apos `await updateStatus.mutateAsync`. Mesma correcao: abrir window imediatamente no gesto.

## Detalhes Tecnicos

### Padrao de impressao unificado (usePrintOrder.ts)

```text
Gesto do usuario (click)
    |
    v
window.open("", "_blank")  <-- abre IMEDIATAMENTE no gesto
    |
    v
document.write(htmlContent)
    |
    v
window.print()  <-- sem awaits entre open e print
```

Para auto-print (receber pedido), como nao ha gesto:

```text
Novo pedido chega (realtime)
    |
    v
Toast: "Novo pedido #123! [Imprimir]"  <-- usuario clica = gesto
    |
    v
printOrder() com window.open + print
```

Para confirmar pedido, onde ha gesto mas com await no meio:

```text
Click "Confirmar"
    |
    v
const printWin = window.open("", "_blank")  <-- reserva janela no gesto
    |
    v
await updateStatus.mutateAsync(...)
    |
    v
printWin.document.write(html) + printWin.print()  <-- usa janela ja aberta
```

### Arquivos a modificar

1. `src/hooks/usePrintOrder.ts` -- simplificar, remover delays desnecessarios, adicionar metodo que recebe janela pre-aberta
2. `src/pages/dashboard/Pedidos.tsx` -- trocar auto-print por toast com botao
3. `src/components/pedidos/OrderDetailModal.tsx` -- pre-abrir window no gesto antes do await
4. `src/components/pedidos/OrderKanban.tsx` -- pre-abrir window no gesto
5. `src/components/pedidos/OrderList.tsx` -- pre-abrir window no gesto
6. `src/pages/dashboard/Configuracoes.tsx` -- corrigir botao teste para usar window.open

### Resultado esperado

- Clique manual no icone de impressora: abre Rawbt com o recibo correto
- Imprimir ao receber: toast aparece, usuario clica "Imprimir", Rawbt abre com recibo
- Imprimir ao confirmar: ao clicar confirmar, Rawbt abre com recibo imediatamente
- Botao teste em Configuracoes: funciona igual no mobile
- Desktop: continua funcionando normalmente com window.open ou fallback iframe

