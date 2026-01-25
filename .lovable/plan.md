
# Plano de Correção: Timezone São Paulo

## Resumo do Problema

O sistema está filtrando datas usando o timezone do navegador/servidor (provavelmente UTC ou US timezone) ao invés do timezone de São Paulo (GMT-3). Isso causa:
- "Hoje" mostrar pedidos do dia anterior
- "Ontem" mostrar pedidos de dois dias misturados
- Transações financeiras aparecerem em datas erradas

## Causa Raiz

Uso de `new Date()` diretamente ao invés das funções utilitárias do arquivo `src/lib/dateUtils.ts` que já existem no projeto para lidar com timezone de São Paulo.

---

## Correções Necessárias

### 1. Filtro de Pedidos (`src/pages/dashboard/Pedidos.tsx`)

**Problema**: Linha 264 usa `const now = new Date()` para filtrar pedidos por data.

**Correção**:
- Importar `getNowInSaoPaulo` de `@/lib/dateUtils`
- Substituir `new Date()` por `getNowInSaoPaulo()`

```
Linha 264: const now = new Date();
         → const now = getNowInSaoPaulo();
```

---

### 2. Consultas Financeiras (`src/hooks/useFinancial.ts`)

**Problema**: As datas são convertidas para string usando `.toISOString().split("T")[0]` que converte para UTC, causando deslocamento de um dia.

**Correção**:
- Importar `formatInSaoPaulo` de `@/lib/dateUtils`
- Substituir a conversão de data para usar formato de São Paulo

```
Linhas 131-132 e 265-266:
.toISOString().split("T")[0]
→ formatInSaoPaulo(date, "yyyy-MM-dd")
```

Também corrigir as linhas 182 e 219 que salvam `transaction_date`.

---

### 3. Formulário de Despesas (`src/components/financeiro/ExpenseFormModal.tsx`)

**Problema**: Linhas 34 e 100 usam `new Date()` para data inicial.

**Correção**:
- Importar `getNowInSaoPaulo` de `@/lib/dateUtils`
- Substituir `new Date()` por `getNowInSaoPaulo()`

---

### 4. Lista de Transações (`src/components/financeiro/TransactionList.tsx`)

**Problema**: Linha 100 usa `new Date(t.transaction_date)` sem conversão.

**Correção**:
- A data `transaction_date` vem como string "YYYY-MM-DD" do banco
- Usar parse correto para exibição com locale ptBR
- Manter como está pois é apenas formatação de exibição (já está OK)

---

### 5. Gráfico Financeiro (`src/components/financeiro/FinancialChart.tsx`)

**Problema**: Linha 28 usa `format(day, "yyyy-MM-dd")` sem considerar timezone.

**Correção**:
- As datas `startDate` e `endDate` já vêm corrigidas do `FinancialFilters`
- O `eachDayOfInterval` trabalha com as datas locais
- A comparação na linha 30 usa `t.transaction_date` que é string "YYYY-MM-DD"
- **Este arquivo está OK** - não precisa de alteração

---

## Arquivos a Modificar

| Arquivo | Alteração | Prioridade |
|---------|-----------|------------|
| `src/pages/dashboard/Pedidos.tsx` | Substituir `new Date()` por `getNowInSaoPaulo()` | Alta |
| `src/hooks/useFinancial.ts` | Usar `formatInSaoPaulo()` para conversão de datas | Alta |
| `src/components/financeiro/ExpenseFormModal.tsx` | Usar `getNowInSaoPaulo()` para data inicial | Média |

---

## Detalhes Técnicos

### Pedidos.tsx - Mudanças Específicas

```typescript
// Adicionar import
import { getNowInSaoPaulo } from "@/lib/dateUtils";

// Linha 264: Trocar
const now = new Date();
// Por
const now = getNowInSaoPaulo();
```

### useFinancial.ts - Mudanças Específicas

```typescript
// Adicionar import
import { formatInSaoPaulo } from "@/lib/dateUtils";

// Função useFinancialTransactions - Linhas 131-132
.gte("transaction_date", formatInSaoPaulo(filters.startDate, "yyyy-MM-dd"))
.lte("transaction_date", formatInSaoPaulo(filters.endDate, "yyyy-MM-dd"))

// Função useCreateTransaction - Linha 182
transaction_date: formatInSaoPaulo(transaction.transaction_date, "yyyy-MM-dd"),

// Função useUpdateTransaction - Linha 219  
transaction_date: formatInSaoPaulo(transaction_date, "yyyy-MM-dd"),

// Função useFinancialSummary - Linhas 265-266
.gte("transaction_date", formatInSaoPaulo(filters.startDate, "yyyy-MM-dd"))
.lte("transaction_date", formatInSaoPaulo(filters.endDate, "yyyy-MM-dd"))
```

### ExpenseFormModal.tsx - Mudanças Específicas

```typescript
// Adicionar import
import { getNowInSaoPaulo } from "@/lib/dateUtils";

// Linha 34
const [date, setDate] = useState<Date>(getNowInSaoPaulo());

// Linha 100
setDate(getNowInSaoPaulo());
```

---

## Resultado Esperado

Após as correções:
- Filtro "Hoje" em Pedidos mostrará apenas pedidos do dia atual no horário de São Paulo
- Filtro "Ontem" mostrará apenas pedidos do dia anterior
- Transações financeiras serão registradas e filtradas corretamente pelo timezone brasileiro
- Formulário de despesas terá a data atual correta como padrão

---

## Testes Recomendados

1. Acessar Gestão de Pedidos às 22h (horário BR) e verificar se "Hoje" mostra apenas pedidos do dia atual
2. Verificar se "Ontem" não mistura pedidos de dois dias
3. Em Financeiro, criar uma despesa e verificar se aparece no dia correto
4. Filtrar por "Hoje" e confirmar que mostra apenas transações do dia atual BR
