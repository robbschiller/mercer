-- 038_feature_batch.sql
-- Ten-feature batch (docs/features.md Part 2, "Next" tranche).
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

-- Expiring customer links: unresponded shares stop accepting after this.
ALTER TABLE proposal_shares ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- E-signature: the exact name typed at acceptance, kept verbatim as the
-- signature of record (accepted_by_name may later be edited for display).
ALTER TABLE proposal_shares ADD COLUMN IF NOT EXISTS accepted_signature text;

-- In-app notification bell: per-user watermark of the last time the
-- notification feed was opened.
ALTER TABLE user_defaults ADD COLUMN IF NOT EXISTS notifications_seen_at timestamptz;

-- Notification feed reads recent customer-facing events newest-first.
CREATE INDEX IF NOT EXISTS activity_events_user_time_idx
  ON activity_events (user_id, occurred_at DESC);
