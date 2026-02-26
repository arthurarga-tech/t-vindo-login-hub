

# Plano Completo de Revisao do Sistema TaVindo

## Etapa 1 — Codigo Morto e Arquivos Legados

### 1.1 Arquivos para excluir

| Arquivo | Motivo |
|---|---|
| `src/hooks/useCloseTab.ts` | Legado do modelo antigo (mesa = pedido). Substituido por `useCloseTable.ts`. Nenhum outro arquivo importa este hook. |
| `src/hooks/useOpenTables.ts` | Legado. Substituido por `useTables.ts`. Nenhum import encontrado em componentes ativos. |
| `src/components/mesas/CloseTabModal.tsx` | Legado. Substituido por `CloseTableModal.tsx`. Nenhum import encontrado em paginas ativas. |

### 1.2 Componente wrapper desnecessario

| Arquivo | Motivo |
|---|---|
| `src/components/pedidos/QuickOrderProductList.tsx` | Wrapper de 1 linha que apenas redireciona para `ProductSelector`. Usado em `QuickOrderModal.tsx`. Pode ser eliminado e substituido por uso direto de `ProductSelector`. |

---

## Etapa 2 — Notificacao Sonora Duplicada

### Problema
Existem **duas implementacoes independentes** de som de notificacao:
1. `useOrderNotificationSound()` — funcao privada dentro de `src/hooks/useOrders.ts` (linhas 70-103), tocada automaticamente via realtime subscription
2. `useOrderNotification()` — hook em `src/hooks/useOrderNotification.ts`, usado em `Pedidos.tsx` para tocar som baseado em contagem de pendentes

**Resultado**: quando um novo pedido chega, o som pode tocar **duas vezes** — uma do realtime (useOrders) e outra do useEffect no Pedidos.tsx.

### Correcao
- Remover `useOrderNotificationSound` de dentro de `useOrders.ts` e toda a logica de som no realtime subscription (linhas 70-103, 121, 177-182, 203)
- Manter apenas `useOrderNotification.ts` como unica fonte de notificacao, controlado pelo `Pedidos.tsx`
- O hook `useOrderNotification.ts` tambem exibe um toast "Novo pedido recebido!" — verificar se isso nao e redundante com o badge de contagem no Pedidos.tsx

---

## Etapa 3 — Tipagem: Eliminar `as any` Espalhados

### Campos ausentes na interface `Order` (`useOrders.ts`)

Os seguintes campos sao usados extensivamente com `(order as any)` mas nao estao tipados:

| Campo | Usado em |
|---|---|
| `scheduled_for` | OrderDetailModal, usePrintOrder (HTML e texto) |
| `change_for` | OrderDetailModal, usePrintOrder |
| `customer_display_name` | OrderCard, usePrintOrder (ja tipado, ok) |
| `table_number` | usePrintOrder, CloseTabModal |
| `table_id` | usePrintOrder |

**Correcao**: Adicionar `scheduled_for?: string | null`, `change_for?: number | null` a interface `Order` em `useOrders.ts`. Os campos `table_number`, `table_id`, `customer_display_name` ja estao la — verificar se os componentes usam a tipagem correta ao inves de `as any`.

### Outros `as any` a corrigir

| Arquivo | Linha | Problema |
|---|---|---|
| `usePrintSettings.ts:35` | `(establishment as any)?.print_addon_prices` | O campo `print_addon_prices` existe na tabela mas pode nao estar na tipagem do Supabase. Verificar types.ts e corrigir. |
| `Configuracoes.tsx:89` | `(establishment as any).print_addon_prices` | Mesmo problema. |
| `CheckoutForm.tsx:605,777-779` | `(establishment as any)?.opening_hours` etc. | Verificar se `usePublicEstablishment` retorna estes campos tipados. |
| `Pedidos.tsx:327` | `(o as any).scheduled_for` | Resolvido ao adicionar `scheduled_for` na interface Order. |

---

## Etapa 4 — `formatPrice` Duplicado

### Problema
A funcao `formatPrice` esta definida localmente em **4 arquivos** alem da versao centralizada em `src/lib/formatters.ts`:

| Arquivo | Tipo |
|---|---|
| `src/pages/dashboard/Clientes.tsx:60-65` | Funcao local identica |
| `src/pages/loja/OrderConfirmationPage.tsx:209-214` | Funcao local identica |
| `src/pages/loja/OrderTrackingPage.tsx:168-173` | Funcao local identica |
| `src/components/catalogo/AddonList.tsx:200-201` | Funcao local identica |

**Correcao**: Substituir todas por `import { formatPrice } from "@/lib/formatters"`. Esses 4 arquivos ja tem funcoes identicas.

---

## Etapa 5 — Revisao Pagina por Pagina

### 5.1 Pedidos (`/dashboard/pedidos`)

**Desktop**: OK - Kanban e lista funcionam, filtros responsivos.

**Mobile**: OK - Tabs Kanban/Lista adaptam.

**Bugs potenciais**:
- `processQueue` usa `supabase.from("orders").select(...)` direto com `.single()` mas se o pedido ja foi deletado, retorna erro silencioso. Considerar tratamento melhor.
- `filters.showScheduledOnly` filtra com `(o as any).scheduled_for` — corrigir tipagem.

**Melhorias**:
- O botao "Novo Pedido" no mobile so mostra icone `+` sem texto — considerar tooltip.

### 5.2 Mesas (`/dashboard/mesas`)

**Desktop/Mobile**: Layout de grid responsivo OK.

**Bug critico**: `Mesas.tsx` renderiza `OrderDetailModal` com `printAddonPrices` ausente (linha 89-102). O modal recebe todos os print settings exceto `printAddonPrices`. Comparar com `Pedidos.tsx` onde este prop e passado. Precisa adicionar.

**Bug**: Ao fechar `OrderDetailModal` (linha 92), faz `setSelectedOrder(null); setSelectedTable(null)` mas `selectedTable` nunca e usado novamente apos ser setado. Nao e um bug funcional, mas e codigo sem utilidade.

**Melhoria**: Nao ha como navegar entre os pedidos de uma mesa aberta. Ao clicar na mesa, so mostra o pedido mais recente. Deveria mostrar lista de todos os pedidos ou permitir navegacao.

### 5.3 Financeiro (`/dashboard/financeiro`)

**Desktop/Mobile**: Funcional.

**Bug potencial**: `useEffect` de inicializacao de categorias (linhas 44-48) pode disparar infinitamente se `initializeCategories.mutate()` falhar (nao ha dependencia de `initializeCategories` no array, mas tambem nao ha guard contra re-tentativa).

**Melhoria**: Nao ha feedback de loading ao deletar transacao.

### 5.4 Catalogo (`/dashboard/catalogo`)

**Desktop/Mobile**: Tabs Categorias/Adicionais OK.

**Bug potencial**: `useEffect` nas linhas 50-54 e 57-64 podem entrar em loop se `categories` mudar de referencia sem mudanca real de conteudo (o React Query retorna nova referencia a cada query). Na pratica o `selectedCategory?.id` na dependencia do segundo useEffect previne isso.

### 5.5 Meu Negocio (`/dashboard/meu-negocio`)

**Desktop/Mobile**: Layout responsivo OK.

**Bug potencial**: Interfaces `DayHours` e `OpeningHours` sao redefinidas localmente (linhas 23-37) ao inves de importar de `src/types/establishment.ts`. Isso viola o padrao de centralizacao documentado na memoria do projeto.

**Melhoria**: `formatPhone` tambem e redefinida localmente (linhas 161-166) quando ja existe em `src/lib/formatters.ts`.

### 5.6 Clientes (`/dashboard/clientes`)

**Desktop/Mobile**: Tabela com paginacao, OK.

**Bug**: `formatPrice` local (linhas 60-65) — duplicacao ja mencionada na Etapa 4.

**Bug potencial**: Linha 56-58 faz `setTotalCount` dentro do corpo do render (fora de useEffect). Isso pode causar re-renders desnecessarios. Deveria estar em um `useEffect`.

### 5.7 Configuracoes (`/dashboard/configuracoes`)

**Desktop/Mobile**: Cards com configuracoes OK.

**Bug**: `generateReceiptHtml` e importado e chamado diretamente para o teste de impressao (linhas 315-337), mas a funcao nao e exportada — ela e uma funcao local em `usePrintOrder.ts`. Verificar se esta exportada corretamente. (Ela esta como `function generateReceiptHtml` sem `export`, mas e importada via `import { generateReceiptHtml } from "@/hooks/usePrintOrder"` — isso so funciona se foi adicionada ao export do modulo ou se a funcao foi tornada publica.)

**Bug**: O teste de impressao nao passa `printAddonPrices` para `generateReceiptHtml` (linha 315-337). Deve ser o 11o argumento.

### 5.8 Usuarios (`/dashboard/usuarios`)

**Desktop/Mobile**: Tabela funcional, dialogs de add/edit OK.

**Bug potencial no mobile**: A tabela de usuarios pode ficar muito larga em telas pequenas. Nao tem scroll horizontal nem layout de cards para mobile.

**Melhoria**: Ao remover membro, o usuario auth continua existindo — deveria deletar o user via service role para evitar orphaned users.

### 5.9 Meu Plano (`/dashboard/meu-plano`)

**Desktop/Mobile**: Cards de plano responsivos.

**Inconsistencia**: O titulo da pagina e "Meu Perfil" (linha 88) mas o menu lateral diz "Meu Perfil" tambem — consistente entre si, mas o path e `/dashboard/meu-plano` o que pode confundir.

### 5.10 Loja Publica (`/loja/:slug`)

**Desktop/Mobile**: Layout responsivo, tema dinamico OK.

**Sem bugs identificados**.

### 5.11 Checkout (`/loja/:slug/checkout`)

**Desktop/Mobile**: Fluxo de scheduling e fechamento OK.

**Bug potencial**: `CheckoutForm.tsx` usa `(establishment as any)?.address` — a tipagem de `usePublicEstablishment` pode nao incluir todos os campos. Verificar.

### 5.12 Confirmacao de Pedido (`/loja/:slug/pedido/:orderId`)

**Bug menor**: Card "Entrega" sempre mostra titulo "Entrega" mesmo para pedidos de retirada ou consumo local. Deveria adaptar baseado em `order.order_type`.

### 5.13 Rastreamento (`/loja/:slug/rastrear`)

**Desktop/Mobile**: OK, sem bugs.

---

## Etapa 6 — Configuracoes por Estabelecimento

### Verificacao de isolamento

Todas as queries no dashboard filtram por `establishment_id` via `useEstablishment()` — **OK**.

**Problema potencial**: No `useOrders.ts`, o realtime subscription filtra por `establishment_id` — OK. No `useTables.ts` — verificar se tambem filtra.

**Verificar**: `usePrintSettings.ts` — depende de `useEstablishment()` — OK, configuracoes sao por estabelecimento.

**Verificar**: Categorias financeiras e inicializacao — `useInitializeCategories` usa `establishment.id` — OK.

---

## Etapa 7 — Ideias para Implementar no TaVindo

| Ideia | Descricao | Prioridade |
|---|---|---|
| **Dashboard / Home** | Pagina inicial com metricas resumidas: pedidos do dia, faturamento, ticket medio, horario de pico | Alta |
| **Estoque basico** | Controle simples de quantidade de produtos, alerta de estoque baixo, pausa automatica quando zerado | Media |
| **Cupons de desconto** | Sistema de cupons (percentual ou valor fixo), com validade e limite de uso | Media |
| **Taxas de entrega por bairro** | Configurar taxa diferente por bairro/regiao ao inves de taxa unica | Media |
| **Relatorios e exportacao** | Exportar pedidos e financeiro como CSV/Excel, relatorios graficos por periodo | Alta |
| **Avaliacao pos-pedido** | Sistema de avaliacao (1-5 estrelas) via link no WhatsApp apos entrega | Baixa |
| **Modo escuro na loja publica** | Toggle de dark mode na loja do cliente | Baixa |
| **Programa de fidelidade** | Pontos por pedido, recompensas (ex: a cada 10 pedidos, 1 gratis) | Media |
| **Multi-unidades** | Um proprietario gerenciando multiplos estabelecimentos com dashboard unificado | Baixa |
| **Impressao de comanda parcial** | Imprimir apenas itens novos de um pedido de mesa, sem reimprimir os anteriores (ja modelado, falta implementar no detalhe) | Alta |

---

## Resumo de Acoes por Prioridade

### Prioridade Alta (bugs e codigo morto)
1. Excluir `useCloseTab.ts`, `useOpenTables.ts`, `CloseTabModal.tsx`
2. Remover `useOrderNotificationSound` duplicado de `useOrders.ts`
3. Adicionar `scheduled_for` e `change_for` na interface `Order`
4. Substituir `formatPrice` local por import centralizado (4 arquivos)
5. Corrigir `printAddonPrices` ausente em `Mesas.tsx` e no teste de impressao em `Configuracoes.tsx`

### Prioridade Media (limpeza e tipagem)
6. Eliminar `as any` — corrigir tipagens em ~15 arquivos
7. Importar `DayHours`/`OpeningHours` de `src/types/establishment.ts` em `MeuNegocio.tsx`
8. Importar `formatPhone` de `src/lib/formatters.ts` em `MeuNegocio.tsx`
9. Eliminar wrapper `QuickOrderProductList.tsx`
10. Mover `setTotalCount` em `Clientes.tsx` para dentro de `useEffect`

### Prioridade Baixa (melhorias UX)
11. Usuarios.tsx: layout de cards no mobile ao inves de tabela
12. OrderConfirmationPage: adaptar titulo "Entrega" por tipo de pedido
13. Mesas.tsx: navegar entre pedidos de uma mesa aberta

