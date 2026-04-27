-- Outreach state per lead: when did we last reach out, when's the next
-- follow-up due, how many attempts have we logged. Drives the workflow
-- of working through a 1,000+ row attendee list without losing track.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_at date,
  ADD COLUMN IF NOT EXISTS contact_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS leads_user_id_follow_up_at_idx
  ON leads (user_id, follow_up_at)
  WHERE follow_up_at IS NOT NULL;
