import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeWebhookSecret } from "@/lib/stripe";
import {
  getSubscriptionByCustomer,
  upsertSubscriptionFromStripe,
} from "@/lib/billing";

/**
 * Stripe → subscriptions mirror. Verifies the signature with the endpoint
 * secret, then upserts the org's row from the latest subscription object.
 * Always answers 2xx once verified so Stripe stops retrying; failures are
 * logged and reconciled by the next event for the same subscription.
 *
 * Point the Stripe endpoint at /api/stripe/webhook with these events:
 * checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted,
 * invoice.paid, invoice.payment_failed.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    // Async variant works under both Node's crypto and WebCrypto runtimes.
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error("[stripe] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const owner = await resolveOwner(sub, session.client_reference_id);
        if (owner) await upsertSubscriptionFromStripe(owner, sub);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const owner = await resolveOwner(sub, null);
        if (owner) await upsertSubscriptionFromStripe(owner, sub);
        break;
      }
      // Renewals and dunning: re-read the subscription so past_due / active
      // flips land even if the subscription.updated event is delayed.
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const details = invoice.parent?.subscription_details;
        if (!details) break;
        const subId =
          typeof details.subscription === "string"
            ? details.subscription
            : details.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const owner = await resolveOwner(sub, null);
        if (owner) await upsertSubscriptionFromStripe(owner, sub);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe] failed handling ${event.type}`, err);
  }

  return NextResponse.json({ received: true });
}

/**
 * Resolve the org through Stripe's object graph first: the Customer is the
 * ownership boundary and checkout records it on the row before the session
 * opens. Subscription metadata and client_reference_id are fallbacks for a
 * customer created outside the app (e.g. from the Stripe dashboard).
 */
async function resolveOwner(
  sub: Stripe.Subscription,
  clientReferenceId: string | null,
): Promise<string | null> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const row = await getSubscriptionByCustomer(customerId);
  if (row) return row.userId;
  const fromMeta = sub.metadata?.owner_user_id;
  if (fromMeta) return fromMeta;
  if (clientReferenceId) return clientReferenceId;
  console.warn(`[stripe] no org for subscription ${sub.id} (customer ${customerId})`);
  return null;
}
