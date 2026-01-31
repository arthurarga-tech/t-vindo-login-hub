-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM (
  'trialing',   -- Em período de teste (30 dias)
  'active',     -- Assinatura ativa e paga
  'past_due',   -- Pagamento atrasado (em carência de 7 dias)
  'canceled',   -- Cancelada pelo usuário
  'expired'     -- Expirada (sem acesso)
);

-- Create enum for billing cycle
CREATE TYPE billing_cycle AS ENUM (
  'monthly',
  'semiannual',
  'annual'
);

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_semiannual TEXT,
  stripe_price_id_annual TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_semiannual NUMERIC NOT NULL DEFAULT 0,
  price_annual NUMERIC NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle billing_cycle,
  trial_starts_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  grace_period_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(establishment_id)
);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_establishment_id ON public.subscriptions(establishment_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);

-- Enable RLS on subscription_plans (public read, no write for users)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (active = true);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Owners can view their subscription
CREATE POLICY "Owners can view their subscription"
  ON public.subscriptions
  FOR SELECT
  USING (
    is_establishment_owner(auth.uid(), establishment_id) OR 
    is_establishment_member(auth.uid(), establishment_id)
  );

-- Owners can update their subscription (for cancel requests, etc.)
CREATE POLICY "Owners can update their subscription"
  ON public.subscriptions
  FOR UPDATE
  USING (is_establishment_owner(auth.uid(), establishment_id));

-- Trigger to auto-create trial subscription when establishment is created
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_establishment_created_subscription
  AFTER INSERT ON public.establishments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Trigger to update updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the default "Básico" plan with Stripe price IDs
INSERT INTO public.subscription_plans (
  name,
  description,
  stripe_price_id_monthly,
  stripe_price_id_semiannual,
  stripe_price_id_annual,
  price_monthly,
  price_semiannual,
  price_annual,
  features,
  active
) VALUES (
  'Básico',
  'Plano completo para seu estabelecimento',
  'price_1Svnm41op6tCNlkzD3ErRxLn',
  'price_1SvnmP1op6tCNlkzeRaJ08vD',
  'price_1Svnmb1op6tCNlkzg1E89QCP',
  95.90,
  529.37,
  978.18,
  '["Gestão completa de pedidos", "Cardápio digital ilimitado", "Relatórios financeiros", "Múltiplos usuários", "Notificações WhatsApp", "Personalização de tema"]'::jsonb,
  true
);