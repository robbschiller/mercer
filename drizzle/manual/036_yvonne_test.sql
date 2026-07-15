-- 036_yvonne_test.sql
-- The Yvonne-test tranche (docs/build-plans/yvonne_test.plan.md): four
-- features that make the quote engine match "proposal from a prompt".
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

-- C: unit-rate ("as found") lines are priced but carry no committed
-- quantity; they render as a rate card and stay out of the bid total.
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS rate_only boolean NOT NULL DEFAULT false;

-- A: lines can cite a document (spec PDF, aerial) the same way they cite
-- photos.
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS evidence_attachment_id uuid
  REFERENCES attachments(id) ON DELETE SET NULL;

-- B: clarifying Q&A for the in-flight draft — [{question, why, answer}] —
-- cleared at approve alongside draft_scope_text.
ALTER TABLE bids ADD COLUMN IF NOT EXISTS draft_clarifications jsonb;

-- D: per-share personalization ("Prepared for Yvonne …").
ALTER TABLE proposal_shares ADD COLUMN IF NOT EXISTS recipient_name text;

-- D: company blocks the branded proposal renders.
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS about_blurb text;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS credentials text;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS cover_letter_template text;
