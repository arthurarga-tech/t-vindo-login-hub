
# Plano: Correção de Exibição de Status e WhatsApp na Loja Pública

## Resumo do Problema

Após as alterações de segurança, foram identificados os seguintes problemas:

1. **Pedido #219 mostra "Pendente" ao invés de "Pronto para Retirada"**: O mapeamento de status nas páginas públicas usa `ready_pickup` mas o status real do banco é `ready_for_pickup`
2. **Botão WhatsApp bloqueado**: Precisa verificar se há referências a `api.whatsapp.com` em vez de `wa.me`
3. **Código duplicado**: Configurações de status duplicadas em 4+ arquivos

---

## Análise Detalhada

### Problema 1: Mapeamento de Status Incorreto

**Arquivos afetados:**
- `src/pages/loja/OrderTrackingPage.tsx` (linha 24)
- `src/pages/loja/OrderConfirmationPage.tsx` (linha 21)

**Status atual no código:**
```typescript
const statusConfig = {
  ready_pickup: { label: "Pronto para Retirada", ... },  // ERRADO
  ready_delivery: { label: "Pronto para Entrega", ... }, // ERRADO
};
```

**Status corretos no banco de dados (de `useOrders.ts`):**
```typescript
type OrderStatus = 
  | "ready"            // Para delivery
  | "ready_for_pickup" // Para retirada
  | "ready_to_serve"   // Para consumo local
```

### Problema 2: WhatsApp URL

O hook `useWhatsAppNotification.ts` usa corretamente `https://wa.me/` (linha 83).
Preciso verificar se há outra fonte gerando `api.whatsapp.com`.

### Problema 3: Duplicação

O `statusConfig` está duplicado em:
- `OrderTrackingPage.tsx`
- `OrderConfirmationPage.tsx`
- `OrderDetailModal.tsx`
- `OrderCard.tsx`

---

## Solução Proposta

### Etapa 1: Criar Arquivo Centralizado de Configuração de Status

**Novo arquivo: `src/lib/orderStatus.ts`**

Este arquivo vai conter:
- Tipo `OrderStatus` e `OrderType` (mover de `useOrders.ts`)
- Configurações de exibição para cada status
- Fluxos de status por tipo de pedido
- Mapeamento de templates WhatsApp

```text
src/lib/orderStatus.ts
├── OrderStatus (tipo)
├── OrderType (tipo)
├── statusConfig (labels, cores, ícones)
├── statusFlowByOrderType
├── getStatusFlow()
├── whatsappTemplateKeys
├── paymentMethodLabels
└── orderTypeLabels
```

### Etapa 2: Corrigir Mapeamento de Status

Adicionar os status corretos:
- `ready_for_pickup` → "Pronto para Retirada"
- `ready_to_serve` → "Pronto para Servir"
- Remover `ready_pickup` e `ready_delivery` que não existem

### Etapa 3: Atualizar Arquivos Consumidores

Refatorar os seguintes arquivos para usar o módulo centralizado:
1. `src/pages/loja/OrderTrackingPage.tsx`
2. `src/pages/loja/OrderConfirmationPage.tsx`
3. `src/components/pedidos/OrderDetailModal.tsx`
4. `src/components/pedidos/OrderCard.tsx`
5. `src/components/pedidos/OrderKanban.tsx`
6. `src/hooks/useWhatsAppNotification.ts`
7. `src/hooks/useOrders.ts` (manter tipos, importar do novo arquivo)

### Etapa 4: Verificar e Testar WhatsApp

Verificar se há outras referências a `api.whatsapp.com` e garantir que todos os links usem `wa.me`.

---

## Mudanças Detalhadas

### 1. Novo Arquivo: `src/lib/orderStatus.ts`

```typescript
import { Clock, CheckCircle, Package, Truck, Home, XCircle, UtensilsCrossed } from "lucide-react";
import { ComponentType } from "react";

// Types
export type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "preparing" 
  | "ready" 
  | "out_for_delivery" 
  | "delivered" 
  | "ready_for_pickup" 
  | "picked_up" 
  | "ready_to_serve" 
  | "served" 
  | "cancelled";

export type OrderType = "delivery" | "pickup" | "dine_in";

// Status display configuration
export interface StatusDisplayConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: ComponentType<{ className?: string }>;
  color: string;
}

export const statusDisplayConfig: Record<OrderStatus, StatusDisplayConfig> = {
  pending: { label: "Pendente", variant: "destructive", icon: Clock, color: "bg-yellow-500" },
  confirmed: { label: "Confirmado", variant: "default", icon: CheckCircle, color: "bg-blue-500" },
  preparing: { label: "Preparando", variant: "secondary", icon: Package, color: "bg-orange-500" },
  ready: { label: "Pronto", variant: "default", icon: Package, color: "bg-green-500" },
  ready_for_pickup: { label: "Pronto para Retirada", variant: "default", icon: Package, color: "bg-green-500" },
  ready_to_serve: { label: "Pronto para Servir", variant: "default", icon: UtensilsCrossed, color: "bg-green-500" },
  out_for_delivery: { label: "Saiu para Entrega", variant: "secondary", icon: Truck, color: "bg-purple-500" },
  delivered: { label: "Entregue", variant: "outline", icon: Home, color: "bg-green-600" },
  picked_up: { label: "Retirado", variant: "outline", icon: CheckCircle, color: "bg-green-600" },
  served: { label: "Servido", variant: "outline", icon: CheckCircle, color: "bg-green-600" },
  cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle, color: "bg-red-500" },
};

// Status flows by order type
export const statusFlowByOrderType: Record<OrderType, OrderStatus[]> = {
  delivery: ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
  pickup: ["pending", "confirmed", "preparing", "ready_for_pickup", "picked_up"],
  dine_in: ["pending", "confirmed", "preparing", "ready_to_serve", "served"],
};

export function getStatusFlow(orderType: OrderType): OrderStatus[] {
  return statusFlowByOrderType[orderType] || statusFlowByOrderType.delivery;
}

// WhatsApp template key mapping
export const statusToWhatsAppTemplateKey: Partial<Record<OrderStatus, string>> = {
  confirmed: "confirmed",
  preparing: "preparing",
  ready_for_pickup: "ready_pickup",
  ready: "ready_delivery",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  picked_up: "picked_up",
  served: "served",
};

// Order type labels
export const orderTypeLabels: Record<OrderType, { label: string; icon: string }> = {
  delivery: { label: "Entrega", icon: "🚚" },
  pickup: { label: "Retirada", icon: "📦" },
  dine_in: { label: "No Local", icon: "🍽️" },
};

// Payment method labels
export const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  cash: "Dinheiro",
};

// Next status button labels
export const nextStatusButtonLabels: Record<OrderStatus, string> = {
  pending: "",
  confirmed: "Confirmar Pedido",
  preparing: "Iniciar Preparo",
  ready: "Marcar como Pronto",
  ready_for_pickup: "Pronto p/ Retirada",
  ready_to_serve: "Pronto p/ Servir",
  out_for_delivery: "Saiu para Entrega",
  delivered: "Marcar como Entregue",
  picked_up: "Marcar como Retirado",
  served: "Marcar como Servido",
  cancelled: "Cancelar",
};

// Quick action labels (compact)
export const quickActionLabels: Record<OrderStatus, string> = {
  pending: "Confirmar",
  confirmed: "Preparar",
  preparing: "Pronto",
  ready: "Saiu Entrega",
  ready_for_pickup: "Retirado",
  ready_to_serve: "Servido",
  out_for_delivery: "Entregue",
  delivered: "",
  picked_up: "",
  served: "",
  cancelled: "",
};

// Finalized statuses (for tracking page)
export const finalizedStatuses: OrderStatus[] = ["delivered", "picked_up", "served", "cancelled"];

// Helper to get status display or fallback to pending
export function getStatusDisplay(status: string): StatusDisplayConfig {
  return statusDisplayConfig[status as OrderStatus] || statusDisplayConfig.pending;
}
```

### 2. Atualizar `OrderTrackingPage.tsx`

**Remover:**
- Definição local de `statusConfig`
- Definição local de `paymentMethodLabels`
- Definição local de `orderTypeLabels`
- Definição local de `finalizedStatuses`

**Adicionar:**
```typescript
import { 
  statusDisplayConfig, 
  paymentMethodLabels, 
  orderTypeLabels, 
  finalizedStatuses,
  getStatusDisplay,
  OrderStatus 
} from "@/lib/orderStatus";
```

**Alterar uso:**
```typescript
// Antes:
const status = order ? (statusConfig[order.status] || statusConfig.pending) : null;

// Depois:
const status = order ? getStatusDisplay(order.status) : null;
```

### 3. Atualizar `OrderConfirmationPage.tsx`

Mesmas mudanças que OrderTrackingPage.tsx.

### 4. Atualizar `OrderDetailModal.tsx`

**Remover:**
- Definição local de `statusConfig`
- Definição local de `paymentLabels`
- Definição local de `nextStatusLabels`
- Definição local de `previousStatusLabels`

**Importar do módulo centralizado.**

### 5. Atualizar `OrderCard.tsx`

**Remover:**
- Definição local de `statusConfig`
- Definição local de `nextStatusLabels`
- Definição local de `paymentLabels`

**Importar do módulo centralizado.**

### 6. Atualizar `useOrders.ts`

**Remover:**
- `OrderStatus` type (mover para orderStatus.ts)
- `OrderType` type (mover para orderStatus.ts)
- `orderTypeLabels` (mover para orderStatus.ts)
- `statusFlowByOrderType` (mover para orderStatus.ts)
- `getStatusFlow` (mover para orderStatus.ts)

**Adicionar:**
```typescript
import { 
  OrderStatus, 
  OrderType, 
  orderTypeLabels, 
  statusFlowByOrderType, 
  getStatusFlow 
} from "@/lib/orderStatus";

// Re-export for backwards compatibility
export { OrderStatus, OrderType, orderTypeLabels, getStatusFlow };
```

### 7. Atualizar `useWhatsAppNotification.ts`

**Remover:**
- `statusToTemplateKey` (mover para orderStatus.ts)

**Importar:**
```typescript
import { statusToWhatsAppTemplateKey, OrderStatus } from "@/lib/orderStatus";
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/orderStatus.ts` | Criar | Módulo centralizado de configuração de status |
| `src/pages/loja/OrderTrackingPage.tsx` | Modificar | Importar configurações centralizadas |
| `src/pages/loja/OrderConfirmationPage.tsx` | Modificar | Importar configurações centralizadas |
| `src/components/pedidos/OrderDetailModal.tsx` | Modificar | Importar configurações centralizadas |
| `src/components/pedidos/OrderCard.tsx` | Modificar | Importar configurações centralizadas |
| `src/components/pedidos/OrderKanban.tsx` | Modificar | Verificar consistência |
| `src/components/pedidos/OrderList.tsx` | Modificar | Verificar consistência |
| `src/hooks/useOrders.ts` | Modificar | Re-exportar do módulo centralizado |
| `src/hooks/useWhatsAppNotification.ts` | Modificar | Importar do módulo centralizado |

---

## Testes a Realizar

1. **Teste de Status na Página de Rastreamento**
   - Acessar `/loja/dom-burguer/rastrear`
   - Buscar pedido #219
   - Verificar se mostra "Pronto para Retirada" (não "Pendente")

2. **Teste de WhatsApp**
   - Abrir um pedido no dashboard
   - Clicar no botão do WhatsApp
   - Verificar se abre `wa.me` com a mensagem correta

3. **Teste de Fluxo Completo - Retirada**
   - Criar pedido de retirada na loja pública
   - Avançar status: pendente → confirmado → preparando → pronto p/ retirada → retirado
   - Verificar se cliente vê status correto em cada etapa

4. **Teste de Fluxo Completo - Delivery**
   - Criar pedido de delivery
   - Avançar status: pendente → confirmado → preparando → pronto → saiu p/ entrega → entregue
   - Verificar status na página de rastreamento

5. **Teste de Fluxo Completo - Consumo Local**
   - Criar pedido via Novo Pedido - Balcão (dine_in)
   - Avançar status: pendente → confirmado → preparando → pronto p/ servir → servido
   - Verificar consistência

6. **Teste de WhatsApp em Cada Status**
   - Para cada status que tem template, clicar no botão WhatsApp
   - Verificar se a mensagem está formatada corretamente

---

## Benefícios da Refatoração

1. **Manutenibilidade**: Mudanças de status em um único lugar
2. **Consistência**: Mesmo mapeamento em todas as páginas
3. **Tipo seguro**: TypeScript garante uso correto de status
4. **Testabilidade**: Configurações exportáveis para testes unitários
5. **Documentação**: Código auto-documentado com tipos claros
