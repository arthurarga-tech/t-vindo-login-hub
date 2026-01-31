import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishment } from "./useEstablishment";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";
export type BillingCycle = "monthly" | "semiannual" | "annual";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_semiannual: string | null;
  stripe_price_id_annual: string | null;
  price_monthly: number;
  price_semiannual: number;
  price_annual: number;
  features: string[];
}

export interface Subscription {
  id: string;
  establishment_id: string;
  plan_id: string | null;
  plan: SubscriptionPlan | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle | null;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_ends_at: string | null;
  daysRemaining: number;
  isBlocked: boolean;
  canAccessDashboard: boolean;
}

function calculateDaysRemaining(subscription: {
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_period_ends_at: string | null;
}): number {
  const now = new Date();
  let targetDate: Date | null = null;

  if (subscription.status === "trialing" && subscription.trial_ends_at) {
    targetDate = new Date(subscription.trial_ends_at);
  } else if (subscription.status === "active" && subscription.current_period_end) {
    targetDate = new Date(subscription.current_period_end);
  } else if (subscription.status === "past_due" && subscription.grace_period_ends_at) {
    targetDate = new Date(subscription.grace_period_ends_at);
  }

  if (!targetDate) return 0;

  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function calculateIsBlocked(subscription: {
  status: string;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
}): boolean {
  const now = new Date();

  // Expired status is always blocked
  if (subscription.status === "expired") return true;

  // Canceled status is blocked
  if (subscription.status === "canceled") return true;

  // Trial expired
  if (subscription.status === "trialing" && subscription.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at);
    if (now > trialEnd) return true;
  }

  // Grace period expired
  if (subscription.status === "past_due" && subscription.grace_period_ends_at) {
    const graceEnd = new Date(subscription.grace_period_ends_at);
    if (now > graceEnd) return true;
  }

  return false;
}

export function useSubscription() {
  const { data: establishment } = useEstablishment();

  return useQuery({
    queryKey: ["subscription", establishment?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!establishment?.id) return null;

      // Fetch subscription with plan
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq("establishment_id", establishment.id)
        .single();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      if (!subscription) return null;

      const daysRemaining = calculateDaysRemaining(subscription);
      const isBlocked = calculateIsBlocked(subscription);

      return {
        id: subscription.id,
        establishment_id: subscription.establishment_id,
        plan_id: subscription.plan_id,
        plan: subscription.plan ? {
          ...subscription.plan,
          features: Array.isArray(subscription.plan.features) 
            ? subscription.plan.features as string[]
            : [],
        } : null,
        stripe_customer_id: subscription.stripe_customer_id,
        stripe_subscription_id: subscription.stripe_subscription_id,
        status: subscription.status as SubscriptionStatus,
        billing_cycle: subscription.billing_cycle as BillingCycle | null,
        trial_starts_at: subscription.trial_starts_at,
        trial_ends_at: subscription.trial_ends_at,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        grace_period_ends_at: subscription.grace_period_ends_at,
        daysRemaining,
        isBlocked,
        canAccessDashboard: !isBlocked,
      };
    },
    enabled: !!establishment?.id,
    refetchInterval: 60000, // Refetch every minute to keep status updated
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("active", true);

      if (error) {
        console.error("Error fetching subscription plans:", error);
        return [];
      }

      return (data || []).map((plan) => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features as string[] : [],
      }));
    },
  });
}
