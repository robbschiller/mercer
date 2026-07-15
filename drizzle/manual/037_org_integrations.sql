-- 037_org_integrations.sql
-- Bring-your-own Claude API key (Settings → Integrations): each org runs the
-- AI features on its own Anthropic account instead of the platform's key.
-- The key is stored AES-256-GCM encrypted (see src/lib/integrations.ts);
-- only the last 4 characters are ever rendered back.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

CREATE TABLE IF NOT EXISTS org_integrations (
  user_id uuid PRIMARY KEY,
  anthropic_key_ciphertext text,
  anthropic_key_last4 text,
  anthropic_key_added_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
