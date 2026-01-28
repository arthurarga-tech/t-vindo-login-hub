
# Plano de Modernização da Loja - Mobile First

## Objetivo
Transformar a experiência da loja pública para ser **otimizada para mobile**, com produtos visíveis rapidamente, informações essenciais acessíveis e navegação intuitiva por categoria.

---

## Problemas Identificados (Visão Mobile)

| Problema | Impacto no Mobile |
|----------|-------------------|
| Header usa `bg-primary` (laranja padrão) ao invés da cor cadastrada | Marca do estabelecimento não é respeitada |
| Nome truncado com "A..." | Usuário não identifica a loja |
| Badge "Fechado" + texto "Fechado agora" abaixo | Ocupa 2 linhas com mesma informação |
| Card Alert "Estabelecimento Fechado" | Ocupa ~80px de altura valiosa |
| StoreInfo com grid 7 dias visível | Empurra produtos para ~600px de scroll |
| Sem filtro de categorias | Difícil navegar em catálogos grandes |

---

## Arquitetura das Mudanças

```text
ANTES (viewport 390x844):
┌─────────────────────────────────┐
│ [Logo] A...   [Fechado][🛒]     │ ← Nome cortado
│         Fechado agora           │ ← Texto redundante
├─────────────────────────────────┤
│ ⚠️ Estabelecimento Fechado      │ ← Card redundante
│ Abrimos Amanhã às 13:30         │
├─────────────────────────────────┤
│ ⏱ 30-40 min                     │
│ 📍 Rua do Rosário...            │
│ 📞 (35) 99750-3633              │
│ 🕐 Seg Ter Qua Qui Sex Sab Dom  │ ← Grid ocupa muito
│    13  13  13  13  13  fec fec  │
│    20  19  19  19  19           │
│ 🚚 Pedido mínimo: R$ 10,00      │
├─────────────────────────────────┤
│ PRODUTOS (muito abaixo!)        │ ← ~600px de scroll
└─────────────────────────────────┘

DEPOIS (viewport 390x844):
┌─────────────────────────────────┐
│ [Logo]             [🧭][🛒]     │ ← Header limpo
│ Açaí da Jana                    │ ← Nome completo
│      [🔴 Abre Amanhã 13:30]     │ ← Status integrado
├─────────────────────────────────┤
│ [Todos][Açaí 300][Açaí 500][▶  │ ← Filtro sticky
├─────────────────────────────────┤
│ ⏱ 30-40 min  📍 Centro    [+]  │ ← Compacto
├─────────────────────────────────┤
│ 🍨 PRODUTOS (visíveis!)         │ ← ~180px de scroll
│   [Produto 1]  [Produto 2]      │
└─────────────────────────────────┘
```

---

## Mudanças Detalhadas

### 1. StoreHeader.tsx - Otimização Mobile

**Arquivo:** `src/components/loja/StoreHeader.tsx`

**Mudanças:**

1. **Cor dinâmica já funciona** - O `headerStyle` já aplica `primaryColor`, mas precisa garantir que está sendo usado corretamente
2. **Remover texto redundante "Fechado agora"** (linhas 181-188) - já existe badge no header
3. **Integrar próximo horário no badge de status** - mostrar "Abre Amanhã 13:30" direto no badge
4. **Aumentar espaço para nome** - reorganizar layout para nome ocupar linha completa em mobile

**Nova estrutura mobile:**
```text
Linha 1: [Logo 40px] [Acompanhar] [Carrinho]
Linha 2: Nome do Estabelecimento (completo)
Linha 3: [Badge: 🔴 Abre Amanhã 13:30]
```

**Props adicionais necessárias:**
- `nextOpenTime?: { day: string; time: string } | null` (já disponível via `useStoreOpeningHours`)

---

### 2. StorePage.tsx - Remover Redundâncias

**Arquivo:** `src/pages/loja/StorePage.tsx`

**Mudanças:**

1. **Remover Alert "Estabelecimento Fechado"** (linhas 119-134)
   - Informação já integrada no header
   - Economiza ~80px de altura

2. **Passar `nextOpenTime` para StoreHeader**
   - Já calculado pelo hook `useStoreOpeningHours`

3. **Adicionar CategoryFilter** (novo componente)
   - Inserir entre header e StoreInfo
   - Sticky para ficar sempre visível ao scrollar

---

### 3. StoreInfo.tsx - Formato Compacto

**Arquivo:** `src/components/loja/StoreInfo.tsx`

**Redesign completo para mobile:**

**Modo Compacto (padrão):**
```text
┌────────────────────────────────────────┐
│ ⏱ 30-40 min    📍 Centro, Jesuânia [▼]│
└────────────────────────────────────────┘
```

**Modo Expandido (ao clicar [▼]):**
```text
┌────────────────────────────────────────┐
│ ⏱ 30-40 min    📍 Centro, Jesuânia [▲]│
├────────────────────────────────────────┤
│ "Açaí cremoso e delicioso..."          │
│                                         │
│ 📞 (35) 99750-3633                      │
│ 📍 Rua do Rosário, 320                  │
│                                         │
│ 🕐 Horários                             │
│    Seg: 13:00-20:00                     │
│    Ter: 13:30-19:00                     │
│    ...                                  │
│                                         │
│ 🚚 Pedido mínimo: R$ 10,00              │
└────────────────────────────────────────┘
```

**Implementação:**
- Usar `Collapsible` do Radix (já disponível)
- Estado `isExpanded` default `false`
- Animação suave de abertura
- Botão toggle estilo "Ver mais" / "Ver menos"

---

### 4. CategoryFilter.tsx - Novo Componente

**Arquivo:** `src/components/loja/CategoryFilter.tsx` (criar)

**Características mobile-first:**

- **Sticky** abaixo do header (z-index 40)
- **Scroll horizontal** nativo (touch-friendly)
- **Altura compacta** (~44px)
- **Touch targets** mínimo 44x44px
- **Feedback visual** na categoria ativa

**Layout:**
```text
┌────────────────────────────────────────┐
│ [Todos] [Açaí 300ml] [Açaí 500ml] [▶  │
└────────────────────────────────────────┘
```

**Props:**
```typescript
interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; image_url?: string | null }>;
  onSelectCategory: (categoryId: string | null) => void;
  activeCategory: string | null;
}
```

**Comportamento:**
- Clicar em categoria → scroll suave para seção
- Categoria "Todos" seleciona null (mostra todas)
- Scroll automático do filtro para manter categoria ativa visível

---

### 5. CategorySection.tsx - Adicionar Navegação

**Arquivo:** `src/components/loja/CategorySection.tsx`

**Mudança:**
- Adicionar `id` para navegação por âncora

```tsx
<section
  id={`category-${category.id}`}  // ADICIONAR
  data-testid={`category-section-${category.id}`}
  // ...
>
```

---

## Arquivos a Modificar

| Arquivo | Tipo | Prioridade |
|---------|------|------------|
| `src/components/loja/StoreHeader.tsx` | Modificar | Alta |
| `src/pages/loja/StorePage.tsx` | Modificar | Alta |
| `src/components/loja/StoreInfo.tsx` | Redesenhar | Alta |
| `src/components/loja/CategoryFilter.tsx` | Criar | Alta |
| `src/components/loja/CategorySection.tsx` | Modificar | Média |

---

## Seção Tecnica

### StoreHeader.tsx - Mudanças Especificas

```typescript
// Adicionar prop
interface StoreHeaderProps {
  // ... props existentes
  nextOpenTime?: { day: string; time: string } | null;
}

// Mudanca no layout mobile (linhas 112-143):
// ANTES: flex items-center justify-between gap-2
// DEPOIS: flex flex-col para mobile, row para desktop

// Remover linhas 181-188 (texto redundante "Fechado agora")

// Modificar badge de status para incluir horário:
// "Fechado" → "Abre Amanhã 13:30" (quando nextOpenTime disponível)
```

### StorePage.tsx - Mudancas Especificas

```typescript
// Adicionar import
import { CategoryFilter } from "@/components/loja/CategoryFilter";

// Adicionar estado para categoria ativa
const [activeCategory, setActiveCategory] = useState<string | null>(null);

// Remover bloco Alert (linhas 119-134)

// Adicionar CategoryFilter após header:
<CategoryFilter
  categories={categories || []}
  activeCategory={activeCategory}
  onSelectCategory={setActiveCategory}
/>

// Passar nextOpenTime para StoreHeader:
<StoreHeader
  // ... props existentes
  nextOpenTime={nextOpenTime}
/>
```

### StoreInfo.tsx - Redesign Completo

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

// Adicionar estado
const [isExpanded, setIsExpanded] = useState(false);

// Layout compacto como trigger
// Conteúdo expandido dentro de CollapsibleContent
```

### CategoryFilter.tsx - Novo Componente

```typescript
import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; image_url?: string | null }>;
  onSelectCategory: (categoryId: string | null) => void;
  activeCategory: string | null;
}

export function CategoryFilter({ categories, onSelectCategory, activeCategory }: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelect = (categoryId: string | null) => {
    onSelectCategory(categoryId);
    
    // Scroll suave para a seção
    if (categoryId) {
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="sticky top-[76px] z-40 bg-background/95 backdrop-blur-sm border-b py-2"
      data-testid="category-filter"
    >
      <div className="max-w-4xl mx-auto px-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            className="flex-shrink-0 h-9"
            onClick={() => handleSelect(null)}
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0 h-9"
              onClick={() => handleSelect(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Metricas de Sucesso Mobile

| Metrica | Antes | Depois |
|---------|-------|--------|
| Scroll ate primeiro produto | ~600px | ~180px |
| Nome do estabelecimento visivel | Parcial | Completo |
| Informacoes redundantes | 3 locais | 1 local |
| Navegacao por categoria | Inexistente | Sticky filter |
| Touch targets | Variavel | Min 44px |

---

## Ordem de Implementacao

1. **Fase 1**: StoreHeader - layout mobile, remover texto redundante, integrar nextOpenTime
2. **Fase 2**: StorePage - remover Alert, passar nextOpenTime
3. **Fase 3**: CategoryFilter - criar componente sticky com scroll horizontal
4. **Fase 4**: StoreInfo - redesenhar para formato compacto com expansao
5. **Fase 5**: CategorySection - adicionar IDs para navegacao
6. **Fase 6**: Testes em dispositivos reais (iPhone SE, Galaxy S21)

---

## Consideracoes de Acessibilidade Mobile

- **Touch targets**: Minimo 44x44px para todos os botoes
- **Contraste**: Manter ratio 4.5:1 em todos os textos
- **Focus states**: Visiveis para navegacao por teclado
- **Screen readers**: ARIA labels em todos os elementos interativos
- **Scroll horizontal**: Indicador visual de mais conteudo (sombra/fade)

---

## CSS Utilitarios Necessarios

```css
/* Adicionar ao index.css se necessario */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```
