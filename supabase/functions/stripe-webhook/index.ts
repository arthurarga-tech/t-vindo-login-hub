import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase env vars not set");

    // Webhook signature verification is mandatory for security
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    let event: Stripe.Event;

    // Always verify webhook signature — prevents forged requests
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No Stripe signature found in request");
      return new Response(JSON.stringify({ error: "No Stripe signature" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook signature verified");

    logStep("Processing event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id, customerId: session.customer });

        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" 
            ? session.subscription 
            : session.subscription.id;
          
          // Fetch full subscription details
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
          
          // Get establishment_id from subscription metadata
          const establishmentId = stripeSubscription.metadata?.establishment_id;
          const billingCycle = stripeSubscription.metadata?.billing_cycle || "monthly";

          if (!establishmentId) {
            logStep("ERROR: No establishment_id in metadata");
            break;
          }

          // Get plan_id based on price
          const priceId = stripeSubscription.items.data[0]?.price?.id;
          const { data: plan } = await supabaseAdmin
            .from("subscription_plans")
            .select("id")
            .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_semiannual.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
            .single();

          // Update subscription in database
          const { error: updateError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              plan_id: plan?.id || null,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              billing_cycle: billingCycle,
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              grace_period_ends_at: null, // Clear any grace period
              updated_at: new Date().toISOString(),
            })
            .eq("establishment_id", establishmentId);

          if (updateError) {
            logStep("ERROR updating subscription", { error: updateError.message });
          } else {
            logStep("Subscription activated", { establishmentId, billingCycle });
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { invoiceId: invoice.id });

        if (invoice.subscription) {
          const subscriptionId = typeof invoice.subscription === "string" 
            ? invoice.subscription 
            : invoice.subscription.id;
          
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              grace_period_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            logStep("ERROR updating subscription after invoice.paid", { error: error.message });
          } else {
            logStep("Subscription renewed", { subscriptionId });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id });

        if (invoice.subscription) {
          const subscriptionId = typeof invoice.subscription === "string" 
            ? invoice.subscription 
            : invoice.subscription.id;

          // Set to past_due with 7-day grace period
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "past_due",
              grace_period_ends_at: gracePeriodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            logStep("ERROR setting past_due status", { error: error.message });
          } else {
            logStep("Subscription set to past_due", { subscriptionId, gracePeriodEnd });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logStep("ERROR setting canceled status", { error: error.message });
        } else {
          logStep("Subscription canceled", { subscriptionId: subscription.id });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

        let newStatus: string;
        switch (subscription.status) {
          case "active":
            newStatus = "active";
            break;
          case "past_due":
            newStatus = "past_due";
            break;
          case "canceled":
          case "unpaid":
            newStatus = "canceled";
            break;
          default:
            newStatus = "active";
        }

        const updateData: Record<string, unknown> = {
          status: newStatus,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (newStatus === "past_due") {
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
          updateData.grace_period_ends_at = gracePeriodEnd.toISOString();
        } else if (newStatus === "active") {
          updateData.grace_period_ends_at = null;
        }

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          logStep("ERROR updating subscription status", { error: error.message });
        } else {
          logStep("Subscription status updated", { subscriptionId: subscription.id, newStatus });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
