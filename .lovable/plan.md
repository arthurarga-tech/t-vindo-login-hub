

# Plano de Compatibilidade iOS/iPhone para TaVindo

## Problema Principal

O iOS Safari bloqueia `window.open()` quando chamado **após operações assíncronas** (como chamadas ao banco de dados). No `CheckoutForm.tsx`, o fluxo é:

```text
Clique "Finalizar" → await supabase.rpc() (criar cliente)
                    → await supabase.rpc() (criar pedido)
                    → await supabase.rpc() (criar itens)
                    → window.open("https://wa.me/...")  ← BLOQUEADO pelo iOS
                    → navigate("/loja/.../pedido/...")
```

O iOS só permite `window.open` em resposta **direta e síncrona** ao clique do usuário. Qualquer `await` entre o clique e o `window.open` faz o Safari classificar como popup e bloquear silenciosamente.

## Problemas Identificados

| Local | Problema iOS | Impacto |
|---|---|---|
| `CheckoutForm.tsx:488` | `window.open(wa.me)` após 3-4 awaits | WhatsApp não abre após checkout com PIX ou localização |
| `OrderConfirmationPage.tsx:160` | `window.open(wa.me)` em handler de clique | OK — clique direto, funciona |
| `OrderConfirmationPage.tsx:202` | `navigator.clipboard.writeText` | Pode falhar se não há HTTPS ou gesto direto |
| `usePrintOrder.ts:509` | `window.open("", "_blank")` no clique | OK — síncrono ao clique |
| `OrderDetailModal.tsx:125` | `window.open` pré-clique, depois async | OK — padrão correto |
| `usePartialPrint.ts:236` | `window.open` em callback async | Pode ser bloqueado se chamado após awaits |

## Solução

### 1. CheckoutForm — Redirecionar via `window.location.href` ao invés de `window.open`

Para o WhatsApp após checkout, substituir `window.open(url, "_blank")` por `window.location.href = url`. Isso funciona no iOS porque não é um popup — é uma navegação na mesma aba. O WhatsApp app intercepta o deep link `https://wa.me/...` e abre automaticamente.

**Porém**, isso impede a navegação para a página de confirmação. A solução é **inverter a ordem**: primeiro navegar para a confirmação, e de lá oferecer o botão de WhatsApp.

**Abordagem final**: Remover o `window.open` do checkout e salvar no localStorage que o usuário precisa enviar WhatsApp. Na `OrderConfirmationPage`, exibir automaticamente um banner com botão para abrir o WhatsApp (usando `window.location.href`), cobrindo os cenários de PIX e localização.

### 2. OrderConfirmationPage — Banner de WhatsApp pós-pedido

Criar um componente de banner que aparece automaticamente quando:
- O pedido foi feito com PIX e há chave configurada
- O cliente marcou "compartilhar localização via WhatsApp"

O botão do banner usa `window.location.href` ao invés de `window.open`. Ao clicar, o usuário vai para o WhatsApp e pode voltar à confirmação pelo histórico do navegador.

### 3. Clipboard — Fallback para iOS

O `navigator.clipboard.writeText` requer contexto seguro (HTTPS) e gesto do usuário. Em produção com HTTPS, funciona no iOS. Mas como fallback, implementar o método legado com `document.execCommand('copy')` caso o clipboard API falhe.

Criar utilitário `copyToClipboard(text)` centralizado:
```text
async copyToClipboard(text):
  try navigator.clipboard.writeText(text)
  catch:
    textarea = document.createElement("textarea")
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
```

### 4. usePartialPrint — Pré-abrir janela antes de async

O `usePartialPrint.ts` já deveria abrir a janela no clique síncrono e escrever nela após o async, seguindo o mesmo padrão de `usePrintOrder.ts`. Verificar e corrigir se necessário.

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/lib/utils.ts` | Adicionar `copyToClipboard()` e `openWhatsApp()` utilitários |
| `src/components/loja/CheckoutForm.tsx` | Remover `window.open(wa.me)`, salvar flag no localStorage |
| `src/pages/loja/OrderConfirmationPage.tsx` | Adicionar banner WhatsApp automático com `window.location.href`, usar `copyToClipboard` |
| `src/components/loja/CheckoutForm.tsx` | Usar `copyToClipboard` para PIX key |
| `src/components/dashboard/DashboardSidebar.tsx` | Usar `copyToClipboard` |
| `src/pages/dashboard/MeuNegocio.tsx` | Usar `copyToClipboard` |
| `src/hooks/useWhatsAppNotification.ts` | Usar `window.location.href` como fallback |
| `src/components/clientes/CustomerDetailModal.tsx` | Usar `window.location.href` como fallback |

## Resumo de Impacto

- **Checkout + PIX no iPhone**: O WhatsApp vai abrir via botão na página de confirmação (não mais automaticamente no checkout), garantindo funcionamento em 100% dos dispositivos
- **Clipboard**: Fallback garante que "Copiar chave PIX" e "Copiar link" funcionem mesmo em navegadores sem Clipboard API
- **Impressão**: Padrão já está correto na maioria dos casos; ajuste pontual no `usePartialPrint`
- **Zero breaking changes no Android/Desktop**: `window.location.href` com `wa.me` funciona igual em todos os dispositivos

