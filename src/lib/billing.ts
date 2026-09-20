import "server-only";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { subscriptions, type Subscription } from "@/db/schema";

/**
 * Billing model (PRD §4 "Business model and pricing", decided 2026-09-20):
 * flat monthly subscription per org, AI included. Stripe is the source of
 * truth for money; the `subscriptions` row is the source of truth for
 * access. Nothing in the request path calls Stripe.
 */

export type PlanId = "starter" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  /** Display price. The charged amount is whatever the Stripe Price says. */
  priceMonthlyUsd: number;
  seats: number;
  blurb: string;
  /** Env var carrying this plan's Stripe Price id (price_...). */
  priceEnv: string;
};

/**
 * PLACEHOLDER price points pending the business decision. The PRD band is
 * $500 to $1000 per month. Change here and in the Stripe Price objects.
 */
export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 499,
    seats: 3,
    blurb: "One estimator plus office. Every AI feature included.",
    priceEnv: "STRIPE_PRICE_STARTER",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 999,
    seats: 10,
    blurb: "Sales team, ops lead, and crew leads on one pipeline.",
    priceEnv: "STRIPE_PRICE_PRO",
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && v in PLANS;
}

export function planPriceId(plan: PlanId): string | null {
  return process.env[PLANS[plan].priceEnv] || null;
}

/** Reverse lookup so a webhook can name the plan from the Stripe Price. */
export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const id of PLAN_IDS) {
    if (planPriceId(id) === priceId) return id;
  }
  return null;
}

/** Billing is wired when the key and at least one plan price exist. */
export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY) && PLAN_IDS.some((p) => planPriceId(p));
}

/**
 * Enforcement switch. Until it is "1", the gate never blocks anyone; the
 * billing page and trial banners still render so the plumbing can be
 * exercised on staging and AQP can be put on a plan before the lock turns on.
 */
export function billingEnforced(): boolean {
  return process.env.BILLING_ENFORCED === "1";
}

export const TRIAL_DAYS = 14;

/**
 * Orgs that onboarded before billing existed get their trial clock started
 * at launch, not at their (much earlier) signup, so flipping enforcement on
 * cannot lock out an existing customer the same day.
 */
export const BILLING_LAUNCH_AT = new Date("2026-09-20T00:00:00Z");

export async function getSubscription(ownerUserId: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, ownerUserId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubscriptionByCustomer(customerId: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  return rows[0] ?? null;
}

/** Records the Stripe customer before any subscription exists. */
export async function ensureSubscriptionRow(
  ownerUserId: string,
  data: { stripeCustomerId: string; plan?: PlanId },
): Promise<void> {
  await db
    .insert(subscriptions)
    .values({
      userId: ownerUserId,
      stripeCustomerId: data.stripeCustomerId,
      plan: data.plan ?? "starter",
      status: "incomplete",
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId: data.stripeCustomerId,
        ...(data.plan ? { plan: data.plan } : {}),
        updatedAt: new Date(),
      },
    });
}

function unix(ts: number | null | undefined): Date | null {
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

/**
 * Mirror one Stripe subscription into the row. Idempotent: webhooks can
 * arrive out of order or twice, and the latest Stripe object always wins.
 * On this API version the period end lives on the subscription item.
 */
export async function upsertSubscriptionFromStripe(
  ownerUserId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan = planFromPriceId(priceId) ?? (isPlanId(sub.metadata?.plan) ? sub.metadata.plan : null);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const values = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    seats: item?.quantity ?? 1,
    currentPeriodEnd: unix(item?.current_period_end),
    trialEndsAt: unix(sub.trial_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    updatedAt: new Date(),
  };
  await db
    .insert(subscriptions)
    .values({ userId: ownerUserId, plan: plan ?? "starter", ...values })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { ...values, ...(plan ? { plan } : {}) },
    });
}

export type AccessLevel = "active" | "trialing" | "grace" | "locked";

export type AccessState = {
  level: AccessLevel;
  /** True only when enforcement is on and the level is locked. */
  blocked: boolean;
  enforced: boolean;
  plan: PlanId | null;
  /** ISO string; trial end for trialing, period end otherwise. */
  until: string | null;
  daysLeft: number | null;
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
};

const OPEN_STATUSES = new Set(["active", "trialing"]);
const GRACE_STATUSES = new Set(["past_due"]);

/**
 * Pure access resolution. A row without a Stripe subscription id is the
 * same as no row: the org is on its implicit trial from onboarding (or from
 * billing launch for pre-launch orgs).
 */
export function resolveAccess(input: {
  sub: Subscription | null;
  onboardingStartedAt: Date | null;
  now?: Date;
}): AccessState {
  const now = input.now ?? new Date();
  const enforced = billingEnforced();
  const sub = input.sub?.stripeSubscriptionId ? input.sub : null;

  const finish = (level: AccessLevel, until: Date | null): AccessState => ({
    level,
    blocked: enforced && level === "locked",
    enforced,
    plan: sub ? (isPlanId(sub.plan) ? sub.plan : null) : null,
    until: until ? until.toISOString() : null,
    daysLeft: until ? Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86_400_000)) : null,
    hasSubscription: Boolean(sub),
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
  });

  if (sub) {
    if (sub.status === "trialing") return finish("trialing", sub.trialEndsAt ?? sub.currentPeriodEnd);
    if (OPEN_STATUSES.has(sub.status)) return finish("active", sub.currentPeriodEnd);
    if (GRACE_STATUSES.has(sub.status)) return finish("grace", sub.currentPeriodEnd);
    return finish("locked", null);
  }

  const start = input.onboardingStartedAt ?? now;
  const clock = start < BILLING_LAUNCH_AT ? BILLING_LAUNCH_AT : start;
  const trialEnd = new Date(clock.getTime() + TRIAL_DAYS * 86_400_000);
  if (now < trialEnd) return finish("trialing", trialEnd);
  return finish("locked", trialEnd);
}

/**
 * Layout-safe: a billing read must never take the app down. If the query
 * fails (table not migrated yet, DB hiccup) we log it and let the request
 * through as if billing were unenforced.
 */
export async function getAccessState(
  ownerUserId: string,
  onboardingStartedAt: Date | null,
): Promise<AccessState> {
  try {
    const sub = await getSubscription(ownerUserId);
    return resolveAccess({ sub, onboardingStartedAt });
  } catch (err) {
    console.error("[billing] access lookup failed; allowing request", err);
    return {
      level: "active",
      blocked: false,
      enforced: false,
      plan: null,
      until: null,
      daysLeft: null,
      hasSubscription: false,
      cancelAtPeriodEnd: false,
    };
  }
}
