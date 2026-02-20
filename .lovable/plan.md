
# Unificação de Cores do Estabelecimento em Toda a Experiência

## Problema Identificado

A aplicação tem dois sistemas de cor:

- **Dashboard** (area do dono): usa `--primary` / `--secondary` CSS vars, redefinidas dinamicamente pelo `DashboardLayout` com as cores do estabelecimento. Funciona bem para a maioria dos elementos Tailwind que usam `text-primary` / `bg-primary`.
- **Loja pública** (area do cliente): usa `--store-primary` / `--store-secondary` vars separadas. Botões e textos grandes já usam `style={{ color: "hsl(var(--store-primary...))" }}`, mas components Radix UI como `RadioGroupItem` e `Checkbox` continuam usando `--primary` (cor padrão do sistema, laranja fixo).

## Causa Raiz

O `RadioGroupItem` (usado nos seletores de entrega/pagamento) e o `Checkbox` usam classes Tailwind como `border-primary`, `text-primary` e `data-[state=checked]:bg-primary` — que apontam para `--primary`, não para `--store-primary`. Na loja pública, `--primary` nunca é sobrescrito para a cor do estabelecimento, então permanecem na cor laranja padrão independente da configuração.

Nos screenshots da loja de Los Hermanos (cor vermelha/marrom), os radio buttons aparecem em laranja padrão ao invés da cor configurada.

## Solução: Estratégia de Unificação

Ao invés de alterar cada componente individualmente (o que seria frágil), a solução é fazer com que `--primary` seja também sobrescrito na loja pública — exatamente como já acontece no dashboard. Assim todos os componentes Radix UI (RadioGroup, Checkbox, Switch, etc.) herdarão a cor correta automaticamente, sem precisar alterar cada um.

### Mudança Central

Nas páginas da loja pública (`StorePage`, `CheckoutPage`, `OrderTrackingPage`, `OrderConfirmationPage`), além de definir `--store-primary` e `--store-secondary`, também sobrescrever `--primary`, `--ring` e `--sidebar-primary` com a cor do estabelecimento. Isso unifica os dois sistemas.

### Manutenção

Criar uma função utilitária centralizada `buildThemeStyles(primaryColor, secondaryColor)` em `src/lib/formatters.ts` que retorna o objeto de estilo completo com todas as CSS vars necessárias. Todas as páginas chamarão essa função única, eliminando duplicação de código.

## Arquivos a Modificar

### 1. `src/lib/formatters.ts` — Nova função utilitária
Adicionar `buildThemeStyles(primary, secondary)` que retorna um objeto com todas as CSS vars:
- `--primary` (para Tailwind e Radix UI)
- `--ring` (para foco dos inputs)
- `--store-primary` (para compatibilidade com código existente)
- `--store-secondary` / `--secondary`

### 2. `src/pages/loja/StorePage.tsx`
Substituir o `useMemo` manual por `buildThemeStyles()`.

### 3. `src/pages/loja/CheckoutPage.tsx`
Substituir o `useMemo` manual por `buildThemeStyles()`.

### 4. `src/pages/loja/OrderTrackingPage.tsx`
Substituir o `useMemo` manual por `buildThemeStyles()`.

### 5. `src/pages/loja/OrderConfirmationPage.tsx`
Substituir o `useMemo` manual por `buildThemeStyles()`.

### 6. `src/components/dashboard/DashboardLayout.tsx`
Substituir o `useMemo` manual por `buildThemeStyles()` — mantendo os vars do sidebar.

## O Que Muda Visualmente

- **RadioButtons** na loja (seletor de entrega, pagamento): passarão a usar a cor do estabelecimento em vez de laranja padrão
- **Checkboxes** na loja (ex: "Compartilhar localização"): cor correta
- **Todos os elementos focados** (inputs): ring de foco na cor do estabelecimento
- **Dashboard**: sem mudança visual — já funciona corretamente, mas o código ficará mais limpo com a função centralizada

## O Que NÃO Muda

- Botões de impressão manual
- Cores semânticas (verde = aberto, vermelho = fechado, destrutivo)
- Cores do kanban de status de pedidos (azul, amarelo, verde, roxo — são significados fixos)
- Login page (cor laranja padrão TáVindo — não depende do estabelecimento)

## Arquivos Modificados

- `src/lib/formatters.ts` — Adicionar `buildThemeStyles()`
- `src/pages/loja/StorePage.tsx` — Usar `buildThemeStyles()`
- `src/pages/loja/CheckoutPage.tsx` — Usar `buildThemeStyles()`
- `src/pages/loja/OrderTrackingPage.tsx` — Usar `buildThemeStyles()`
- `src/pages/loja/OrderConfirmationPage.tsx` — Usar `buildThemeStyles()`
- `src/components/dashboard/DashboardLayout.tsx` — Usar `buildThemeStyles()`
