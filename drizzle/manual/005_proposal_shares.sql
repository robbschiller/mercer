-- Applied by `bun run db:apply-manual`.
-- Adds share links and accept/decline tracking for public proposal pages.

CREATE TABLE IF NOT EXISTS proposal_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  accessed_at timestamptz,
  accepted_at timestamptz,
  accepted_by_name text,
  accepted_by_title text,
  declined_at timestamptz,
  decline_reason text
);

CREATE INDEX IF NOT EXISTS proposal_shares_proposal_id_idx
  ON proposal_shares (proposal_id, created_at DESC);
