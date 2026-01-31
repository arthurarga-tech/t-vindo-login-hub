
# Plano: Sistema de Assinaturas com Stripe

## Resumo das Decisões do Usuário

| Item | Escolha |
|------|---------|
| **Planos** | Apenas Plano Básico (por enquanto) |
| **Preços** | Mensal: R$ 95,90 / Semestral: 8% off / Anual: 15% off |
| **Trial** | 30 dias de acesso completo gratuito |
| **Expiração** | 7 dias de carência antes de bloquear |
| **Gestão** | Página dedicada "Meu Plano" no menu lateral |

### Cálculo dos Preços

| Período | Preço Original | Desconto | Preço Final |
|---------|---------------|----------|-------------|
| Mensal | R$ 95,90 | - | R$ 95,90/mês |
| Semestral | R$ 575,40 (6x R$ 95,90) | 8% | R$ 529,37 (R$ 88,23/mês) |
| Anual | R$ 1.150,80 (12x R$ 95,90) | 15% | R$ 978,18 (R$ 81,52/mês) |

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  LoginCard.tsx          → Cadastro inicia trial automaticamente │
│  ProtectedRoute.tsx     → Verifica status da assinatura        │
│  DashboardSidebar.tsx   → Adiciona "Meu Plano" no menu         │
│  MeuPlano.tsx (nova)    → Página de gestão da assinatura       │
│  useSubscription.ts     → Hook para consultar status           │
│  SubscriptionBanner.tsx → Banner de aviso (trial/expirado)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EDGE FUNCTIONS                            │
├─────────────────────────────────────────────────────────────────┤
│  stripe-create-checkout  → Cria sessão de checkout Stripe      │
│  stripe-webhook          → Recebe eventos do Stripe            │
│  stripe-portal           → Redireciona para portal do cliente  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                │
├─────────────────────────────────────────────────────────────────┤
│  subscriptions           → Armazena dados da assinatura        │
│  subscription_plans      → Configuração dos planos e preços    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Usuário

### 1. Novo Cadastro (Trial)
```text
Usuário cria conta
       │
       ▼
Trigger cria registro em 'subscriptions'
com status = 'trialing' e trial_ends_at = now() + 30 dias
       │
       ▼
Usuário acessa dashboard normalmente
       │
       ▼
Banner amarelo: "Você está no período de teste. Faltam X dias."
```

### 2. Assinatura Ativa
```text
Usuário clica "Meu Plano" ou "Assinar Agora"
       │
       ▼
Edge function cria Stripe Checkout Session
       │
       ▼
Usuário paga no Stripe
       │
       ▼
Webhook atualiza status para 'active'
       │
       ▼
Banner verde: "Plano Básico ativo até DD/MM/YYYY"
```

### 3. Assinatura Expirada (Período de Carência)
```text
Subscription vence (current_period_end < now())
       │
       ▼
Status muda para 'past_due' (carência de 7 dias)
       │
       ▼
Banner vermelho: "Sua assinatura venceu. Renove em X dias."
       │
       ▼
Usuário ainda pode acessar o dashboard
       │
       ▼
Após 7 dias → status = 'expired'
       │
       ▼
ProtectedRoute redireciona para /dashboard/meu-plano
(apenas página de renovação acessível)
```

---

## Detalhamento Técnico

### 1. Banco de Dados

#### Tabela: `subscription_plans`
Armazena a configuração dos planos disponíveis.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| name | text | Nome do plano (ex: "Básico") |
| stripe_price_id_monthly | text | ID do preço mensal no Stripe |
| stripe_price_id_semiannual | text | ID do preço semestral no Stripe |
| stripe_price_id_annual | text | ID do preço anual no Stripe |
| price_monthly | numeric | Preço mensal (95.90) |
| price_semiannual | numeric | Preço semestral (529.37) |
| price_annual | numeric | Preço anual (978.18) |
| features | jsonb | Lista de funcionalidades do plano |
| active | boolean | Se o plano está disponível |

#### Tabela: `subscriptions`
Armazena o status da assinatura de cada estabelecimento.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| establishment_id | uuid | FK para establishments |
| plan_id | uuid | FK para subscription_plans (nullable durante trial) |
| stripe_customer_id | text | ID do cliente no Stripe |
| stripe_subscription_id | text | ID da assinatura no Stripe |
| status | enum | trialing, active, past_due, canceled, expired |
| billing_cycle | enum | monthly, semiannual, annual |
| trial_starts_at | timestamptz | Início do período de teste |
| trial_ends_at | timestamptz | Fim do período de teste |
| current_period_start | timestamptz | Início do período atual |
| current_period_end | timestamptz | Fim do período atual |
| grace_period_ends_at | timestamptz | Fim da carência (7 dias após vencer) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

#### Enum: `subscription_status`
```sql
CREATE TYPE subscription_status AS ENUM (
  'trialing',   -- Em período de teste
  'active',     -- Assinatura ativa e paga
  'past_due',   -- Pagamento atrasado (em carência)
  'canceled',   -- Cancelada pelo usuário
  'expired'     -- Expirada (sem acesso)
);
```

#### Enum: `billing_cycle`
```sql
CREATE TYPE billing_cycle AS ENUM (
  'monthly',
  'semiannual',
  'annual'
);
```

### 2. Trigger: Auto-criar Subscription no Cadastro

Quando um novo estabelecimento é criado, automaticamente cria um registro de subscription em trial:

```sql
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
    establishment_id,
    status,
    trial_starts_at,
    trial_ends_at
  ) VALUES (
    NEW.id,
    'trialing',
    NOW(),
    NOW() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_establishment_created
  AFTER INSERT ON establishments
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();
```

### 3. Edge Functions

#### `stripe-create-checkout`
Cria uma sessão de checkout do Stripe para o usuário assinar.

**Request:**
```json
{
  "priceId": "price_xxx",
  "billingCycle": "monthly" | "semiannual" | "annual",
  "establishmentId": "uuid"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

#### `stripe-webhook`
Recebe eventos do Stripe e atualiza o banco de dados.

**Eventos tratados:**
- `checkout.session.completed` → Cria/atualiza subscription como active
- `invoice.paid` → Atualiza current_period_end
- `invoice.payment_failed` → Marca como past_due
- `customer.subscription.deleted` → Marca como canceled
- `customer.subscription.updated` → Atualiza dados

#### `stripe-portal`
Redireciona o usuário para o portal de gerenciamento do Stripe.

**Request:**
```json
{
  "customerId": "cus_xxx"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### 4. Hook: `useSubscription`

```typescript
interface Subscription {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  plan: SubscriptionPlan | null;
  billingCycle: 'monthly' | 'semiannual' | 'annual' | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
  daysRemaining: number;
  isBlocked: boolean;
  canAccessDashboard: boolean;
}

function useSubscription() {
  // Retorna dados da subscription do estabelecimento atual
  // Calcula automaticamente daysRemaining e isBlocked
}
```

### 5. ProtectedRoute Atualizado

```typescript
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const location = useLocation();

  if (loading || subLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  // Se assinatura está bloqueada e não está na página de plano
  if (subscription?.isBlocked && location.pathname !== '/dashboard/meu-plano') {
    return <Navigate to="/dashboard/meu-plano" />;
  }

  return <>{children}</>;
}
```

### 6. Página "Meu Plano"

Nova página em `/dashboard/meu-plano` com:

**Seções:**
1. **Status Atual** - Mostra plano, status, próxima cobrança
2. **Escolher Plano** - Cards com opções mensal/semestral/anual
3. **Histórico de Faturas** - Lista de pagamentos (futuro)
4. **Gerenciar Assinatura** - Link para portal Stripe

**Estados da UI:**
- **Trial**: Mostra dias restantes + botão "Assinar Agora"
- **Active**: Mostra próxima cobrança + botão "Gerenciar"
- **Past Due**: Aviso de carência + botão "Renovar Agora"
- **Expired**: Tela de bloqueio + apenas opção de assinar

### 7. Banner de Aviso no Dashboard

Componente `SubscriptionBanner` exibido no topo do `DashboardLayout`:

| Status | Cor | Mensagem |
|--------|-----|----------|
| trialing | Amarelo | "Período de teste: X dias restantes" |
| past_due | Vermelho | "Assinatura vencida. Renove em X dias" |
| active (próximo a vencer) | Azul | "Sua assinatura renova em X dias" |

### 8. Menu Lateral Atualizado

Adicionar item "Meu Plano" com ícone de CreditCard entre "Usuários" e "Configurações".

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/xxx_subscription_tables.sql` | Criar | Tabelas e triggers |
| `supabase/functions/stripe-create-checkout/index.ts` | Criar | Edge function checkout |
| `supabase/functions/stripe-webhook/index.ts` | Criar | Edge function webhook |
| `supabase/functions/stripe-portal/index.ts` | Criar | Edge function portal |
| `src/hooks/useSubscription.ts` | Criar | Hook de subscription |
| `src/pages/dashboard/MeuPlano.tsx` | Criar | Página de gestão |
| `src/components/subscription/SubscriptionBanner.tsx` | Criar | Banner de aviso |
| `src/components/subscription/PlanCard.tsx` | Criar | Card de plano |
| `src/components/subscription/SubscriptionStatus.tsx` | Criar | Status atual |
| `src/components/auth/ProtectedRoute.tsx` | Modificar | Verificar subscription |
| `src/components/dashboard/DashboardSidebar.tsx` | Modificar | Adicionar "Meu Plano" |
| `src/components/dashboard/DashboardLayout.tsx` | Modificar | Adicionar banner |
| `src/App.tsx` | Modificar | Nova rota /dashboard/meu-plano |

---

## Configuração Stripe Necessária

Antes de implementar, precisamos:

1. **Habilitar integração Stripe** - Conectar sua conta Stripe ao projeto
2. **Criar produtos no Stripe**:
   - Produto: "Plano Básico TáVindo"
   - Preços: mensal (R$ 95,90), semestral (R$ 529,37), anual (R$ 978,18)
3. **Configurar webhook** - Apontar para a edge function
4. **Salvar Price IDs** - Na tabela `subscription_plans`

---

## Testes a Realizar

1. **Teste de Novo Cadastro**
   - Criar nova conta
   - Verificar se subscription foi criada com status 'trialing'
   - Verificar se trial_ends_at está 30 dias no futuro

2. **Teste de Checkout**
   - Clicar em "Assinar Agora"
   - Completar pagamento no Stripe (modo teste)
   - Verificar se status mudou para 'active'

3. **Teste de Expiração de Trial**
   - Simular trial expirado (alterar data no banco)
   - Verificar se banner aparece
   - Verificar se após 7 dias bloqueia acesso

4. **Teste de Renovação**
   - Simular assinatura vencida
   - Clicar em "Renovar"
   - Verificar se acesso é restaurado

5. **Teste de Portal Stripe**
   - Clicar em "Gerenciar Assinatura"
   - Verificar redirecionamento para portal
   - Testar cancelamento

---

## Ordem de Implementação

1. **Habilitar Stripe** - Conectar integração
2. **Criar tabelas** - Migration com subscription_plans e subscriptions
3. **Criar edge functions** - stripe-create-checkout, stripe-webhook, stripe-portal
4. **Criar hook** - useSubscription
5. **Criar página** - MeuPlano.tsx
6. **Atualizar ProtectedRoute** - Verificar bloqueio
7. **Atualizar menu lateral** - Adicionar "Meu Plano"
8. **Adicionar banner** - SubscriptionBanner no DashboardLayout
9. **Testar fluxo completo**
