import "server-only";
import Stripe from "stripe";

/**
 * Platform Stripe client. Provisioned through the Vercel Marketplace
 * integration, which injects STRIPE_SECRET_KEY; null when the key is
 * absent so every billing surface degrades to "not connected" instead
 * of throwing at import time.
 */
let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}
