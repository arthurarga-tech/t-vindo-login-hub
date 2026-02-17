
# Auditoria Completa do Sistema Tavindo

## 1. BUGS ENCONTRADOS

### 1.1 Bug: `roleLabels` duplicado em `Usuarios.tsx` e `useUserRole.ts`
O arquivo `Usuarios.tsx` define seu proprio `roleLabels` (linha 69-76) identico ao que ja existe em `useUserRole.ts` (linha 16-23). Alem de duplicacao, se alguem atualizar um e esquecer o outro, os labels ficam inconsistentes.

**Correcao**: Remover o `roleLabels` local de `Usuarios.tsx` e usar o exportado por `useUserRole`.

### 1.2 Bug: `formatPrice` duplicado em `StoreInfo.tsx`
O arquivo `StoreInfo.tsx` (linha 58-63) define uma funcao `formatPrice` local identica a que existe em `src/lib/formatters.ts`. Isso viola a centralizacao feita na refatoracao anterior.

**Correcao**: Remover a funcao local e importar de `@/lib/formatters`.

### 1.3 Bug: Configuracoes.tsx - Loading state renderiza conteudo do WhatsApp
No `Configuracoes.tsx`, o bloco de loading (linhas 144-246) renderiza acidentalmente o card de WhatsApp completo (com switches e campos funcionais) dentro do skeleton de carregamento. Isso acontece porque o JSX do card esta dentro do `return` do `if (isLoading)`.

**Correcao**: O loading state deve exibir apenas skeletons, sem cards interativos.

### 1.4 Bug: Warning de ref no `DialogFooter` em `Usuarios.tsx`
O console mostra `Function components cannot be given refs` vindo de `DialogFooter` em `Usuarios.tsx`. Isso acontece porque o Radix Dialog tenta passar ref para `DialogFooter` que nao usa `forwardRef`.

**Correcao**: Garantir que DialogFooter nao receba ref indevido ou envolver em `<div>`.

### 1.5 Bug: `DashboardSidebar` - Fragment sem `key` no map
No `DashboardSidebar.tsx` (linha 152), o `<>` fragment dentro do `.map()` nao tem `key`. O `key` esta no `SidebarMenuItem` filho (linha 153), mas deveria estar no fragment.

**Correcao**: Usar `<Fragment key={item.title}>` ao inves de `<>`.

### 1.6 Bug: `useOrderNotification` hook nao e utilizado no `Pedidos.tsx`
O `Pedidos.tsx` tem sua propria implementacao de `playNotificationSound` inline (linhas 168-198), enquanto existe o hook `useOrderNotification.ts` com uma versao mais robusta (com AudioContext reutilizado e tratamento de suspend). A implementacao inline do Pedidos cria um novo AudioContext a cada chamada, o que pode causar problemas de memoria.

**Correcao**: Usar o hook `useOrderNotification` no `Pedidos.tsx`.

## 2. CODIGOS DUPLICADOS PARA UNIFICAR

### 2.1 Interface `DayHours` / `OpeningHours` duplicada em 4+ arquivos
A mesma interface esta definida em: `StoreHeader.tsx`, `StoreInfo.tsx`, `useStoreOpeningHours.ts`, `ScheduleSelector.tsx`, `CheckoutForm.tsx`, e outros.

**Correcao**: Criar um arquivo `src/types/establishment.ts` e exportar as interfaces compartilhadas.

### 2.2 Uso massivo de `(establishment as any)` - 358 ocorrencias em 18 arquivos
O `useEstablishment` retorna dados sem tipagem, forcando `as any` em todo lugar. Isso ja foi identificado na auditoria anterior mas permanece.

**Correcao**: Tipar o retorno de `useEstablishment` com a interface do Supabase `Tables<"establishments">`, eliminando todos os casts.

### 2.3 Logica de notificacao sonora duplicada
`Pedidos.tsx` (linhas 168-198) e `useOrderNotification.ts` fazem a mesma coisa. O hook e mais robusto.

**Correcao**: Remover a funcao inline de `Pedidos.tsx` e usar `useOrderNotification`.

### 2.4 Parametros de impressao repetidos em todo lugar
Em `Pedidos.tsx`, as variaveis `printFontSize`, `printMarginLeft`, `printMarginRight`, `printFontBold`, `printLineHeight`, `printContrastHigh` sao extraidas com `as any` e passadas manualmente para varios componentes.

**Correcao**: Criar um hook `usePrintSettings()` que retorna esses valores tipados do establishment.

## 3. CODIGO MORTO / NAO UTILIZADO

### 3.1 Paginas placeholder sem funcionalidade
- `src/pages/dashboard/Estoque.tsx` - apenas exibe "Em breve"
- `src/pages/dashboard/Delivery.tsx` - apenas exibe "Em breve"

Essas paginas existem no roteamento mas nao tem funcionalidade. Nao estao no mapa de permissoes do `useUserRole` e nao aparecem no sidebar.

**Correcao**: Remover as rotas e arquivos, ou mantelos se houver planos de implementacao futura. Se mantidos, adicionar ao `ProtectedRoute` para evitar acesso direto via URL.

### 3.2 `src/components/ui/use-toast.ts` - re-export desnecessario
O arquivo `src/components/ui/use-toast.ts` apenas re-exporta `useToast` e `toast` do `src/hooks/use-toast.ts`. Os importadores poderiam importar diretamente.

**Correcao**: Manter como esta (padrao do shadcn/ui) para compatibilidade, pois e usado em `LoginCard.tsx`, `ResetPassword.tsx` e `toaster.tsx`.

### 3.3 `type MemberRole = AppRole` alias desnecessario
Em `Usuarios.tsx` (linha 55), `type MemberRole = AppRole` e um alias sem adicionar valor.

**Correcao**: Usar `AppRole` diretamente.

## 4. MELHORIAS DE UX MOBILE NA LOJA PUBLICA

### 4.1 ProductCard - Imagem ocupa muito espaco no mobile
No `ProductCard.tsx`, a imagem ocupa `h-32` (128px) de altura no mobile com largura total. Isso empurra o conteudo para baixo e reduz a quantidade de produtos visiveis "above the fold".

**Correcao**: Usar layout horizontal (imagem menor ao lado) no mobile, similar ao iFood/Rappi. Exemplo: `flex-row` com imagem de `w-24 h-24`.

### 4.2 CartBar - Area de toque pequena no mobile
O `CartBar.tsx` tem `h-12` no mobile (`sm:h-14`), que esta no limite minimo de 44px recomendado para alvos de toque.

**Correcao**: Aumentar para `h-14` no mobile para melhor acessibilidade.

### 4.3 ProductDetailModal - Scroll pode ser dificil em telas pequenas
O modal usa `max-h-[90vh]` mas nao tem scroll suave no iOS.

**Correcao**: Adicionar `-webkit-overflow-scrolling: touch` e considerar usar `Drawer` (vaul) no mobile ao inves de `Dialog`.

## 5. RESUMO DAS ACOES

### Prioridade Alta (Bugs)
1. Corrigir loading state do `Configuracoes.tsx` que renderiza cards interativos
2. Corrigir Fragment sem key no `DashboardSidebar.tsx`
3. Substituir `playNotificationSound` inline por `useOrderNotification` hook

### Prioridade Media (Duplicacao)
4. Remover `roleLabels` duplicado de `Usuarios.tsx`
5. Remover `formatPrice` duplicado de `StoreInfo.tsx`
6. Criar tipos compartilhados `DayHours`/`OpeningHours` em `src/types/establishment.ts`
7. Tipar `useEstablishment` para eliminar `as any`
8. Criar hook `usePrintSettings` para centralizar parametros de impressao
9. Remover alias `MemberRole`

### Prioridade Baixa (UX Mobile)
10. Melhorar layout do `ProductCard` no mobile (horizontal)
11. Aumentar area de toque do `CartBar`
12. Considerar Drawer no mobile para `ProductDetailModal`

### Detalhes Tecnicos

**Arquivos a modificar:**
- `src/pages/dashboard/Configuracoes.tsx` - corrigir loading state
- `src/components/dashboard/DashboardSidebar.tsx` - Fragment key
- `src/pages/dashboard/Pedidos.tsx` - usar useOrderNotification + usePrintSettings
- `src/pages/dashboard/Usuarios.tsx` - remover duplicacoes
- `src/components/loja/StoreInfo.tsx` - remover formatPrice local
- `src/components/loja/ProductCard.tsx` - layout mobile horizontal
- `src/components/loja/CartBar.tsx` - area de toque
- `src/hooks/useEstablishment.ts` - adicionar tipagem

**Arquivos a criar:**
- `src/types/establishment.ts` - tipos compartilhados
- `src/hooks/usePrintSettings.ts` - hook de configuracoes de impressao

**Arquivos candidatos a remocao (se nao houver planos):**
- `src/pages/dashboard/Estoque.tsx`
- `src/pages/dashboard/Delivery.tsx`
