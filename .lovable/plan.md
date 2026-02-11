

# Remover Pagina Extra de Impressao no Mobile

## Problema

Quando um pedido chega e a impressao automatica esta ativada, no mobile o sistema abre uma **nova janela/aba** com um botao verde "Imprimir Pedido". Isso e a "pagina extra" indesejada. No desktop, o sistema usa um iframe invisivel e abre o dialogo de impressao diretamente.

## Solucao

Unificar o comportamento: usar a **mesma logica do desktop** (iframe oculto) tambem no mobile. Remover o tratamento especial que abre nova janela no mobile.

## Mudanca

**Arquivo: `src/hooks/usePrintOrder.ts`**

- Remover a funcao `isMobileDevice()` e a variavel `mobile`
- Remover o bloco `if (mobile)` que abre `window.open` com botao verde
- Usar sempre o fluxo do iframe oculto (que ja funciona bem) para ambos desktop e mobile
- Remover a propriedade `isMobile` do `PrintResult` (nao sera mais necessaria)

**Arquivo: `src/pages/dashboard/Pedidos.tsx`**

- Remover todas as verificacoes de `result.isMobile` e os `toast.info("Toque no botao verde...")` associados, ja que nao havera mais comportamento diferente por dispositivo

## Resultado

- Desktop e mobile usam o mesmo fluxo de impressao (iframe oculto + dialogo nativo do navegador)
- Nenhuma pagina extra sera aberta no mobile
- Todas as configuracoes de impressao (fonte, margens, negrito, contraste) se aplicam igualmente nos dois dispositivos

