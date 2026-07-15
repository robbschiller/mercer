-- 040_ai_usage.sql
-- Billing pivot: BYO Anthropic keys are gone — every AI feature runs on the
-- platform key and each call's token usage is metered per org for billing.
-- Drops org_integrations (037) and creates the usage ledger.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

DROP TABLE IF EXISTS org_integrations;

CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- org owner (same scoping key the rest of the app bills/queries by)
  user_id uuid NOT NULL,
  -- which surface spent it: quote_engine | ask | morning_brief | follow_up | composer
  feature text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx
  ON ai_usage (user_id, created_at DESC);
