-- 048_subscriptions.sql
-- Billing plumbing (2026-09-20): one subscription row per org, mirrored
-- from Stripe webhooks; the app gates on this row, never on live Stripe
-- calls. Also extends the ai_usage ledger with the actor seat and the
-- model cost frozen at insert time (internal COGS, never invoiced).
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

CREATE TABLE IF NOT EXISTS subscriptions (
  -- org owner (same tenant key as everything else)
  user_id uuid PRIMARY KEY,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  -- starter | pro
  plan text NOT NULL DEFAULT 'starter',
  -- mirrors Stripe: trialing | active | past_due | canceled | unpaid |
  -- incomplete | incomplete_expired | paused
  status text NOT NULL DEFAULT 'incomplete',
  seats integer NOT NULL DEFAULT 1,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_customer_idx
  ON subscriptions (stripe_customer_id);

ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS actor_user_id uuid;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS cost_usd numeric(12, 6) NOT NULL DEFAULT 0;
