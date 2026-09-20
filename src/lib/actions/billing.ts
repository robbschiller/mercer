"use server";

import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org-context";
import { getStripe } from "@/lib/stripe";
import { getAppOrigin } from "@/lib/env";
import {
  billingConfigured,
  ensureSubscriptionRow,
  getSubscription,
  isPlanId,
  planPriceId,
  PLANS,
} from "@/lib/billing";
import { getCompanyProfile } from "@/lib/store";

const BILLING_PATH = "/settings/billing";

function fail(message: string): never {
  redirect(`${BILLING_PATH}?error=${encodeURIComponent(message)}`);
}

/**
 * Owner-only: opens Stripe Checkout in subscription mode for the chosen
 * plan. The org owner id rides along as client_reference_id and as
 * subscription metadata so the webhook can key the mirror row.
 */
export async function startCheckoutAction(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "owner") fail("Only the org owner can change the plan.");

  const plan = formData.get("plan");
  if (!isPlanId(plan)) fail("Pick a plan.");
  const stripe = getStripe();
  const priceId = planPriceId(plan);
  if (!stripe || !billingConfigured() || !priceId) {
    fail("Billing isn't connected yet. Finish the Stripe setup first.");
  }

  const [existing, profile] = await Promise.all([
    getSubscription(ctx.ownerUserId),
    getCompanyProfile(ctx.ownerUserId),
  ]);

  let customerId = existing?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.email ?? undefined,
      name: profile?.companyName || ctx.name || undefined,
      metadata: { owner_user_id: ctx.ownerUserId },
    });
    customerId = customer.id;
  }
  await ensureSubscriptionRow(ctx.ownerUserId, { stripeCustomerId: customerId, plan });

  const origin = getAppOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: ctx.ownerUserId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    // Stable label for the Stripe dashboard's checkout-flow comparisons.
    integration_identifier: "mercer_plan_checkout_qvxrmtbe",
    subscription_data: {
      metadata: { owner_user_id: ctx.ownerUserId, plan },
    },
    metadata: { owner_user_id: ctx.ownerUserId, plan },
    success_url: `${origin}${BILLING_PATH}?success=1`,
    cancel_url: `${origin}${BILLING_PATH}?canceled=1`,
  });
  if (!session.url) fail("Stripe did not return a checkout URL.");
  redirect(session.url);
}

/** Owner-only: Stripe's hosted portal for cards, invoices, and cancellation. */
export async function openBillingPortalAction() {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "owner") fail("Only the org owner can manage billing.");

  const stripe = getStripe();
  if (!stripe) fail("Billing isn't connected yet.");
  const sub = await getSubscription(ctx.ownerUserId);
  if (!sub?.stripeCustomerId) fail(`Choose a plan first. ${PLANS.starter.name} is the default.`);

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${getAppOrigin()}${BILLING_PATH}`,
  });
  redirect(session.url);
}
