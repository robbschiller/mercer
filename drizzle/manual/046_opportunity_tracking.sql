-- 046_opportunity_tracking.sql
-- Phase 2 (docs/roadmap.md §4) — Jordan 2026-09-02: "Opportunities are when
-- you're making the quote … I'd rather us just have fields … just getting
-- that tracking down." The quote as a typed number plus two dates, and the
-- small/large fork stored on the bid itself instead of only on the lead.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

ALTER TABLE bids ADD COLUMN IF NOT EXISTS quote_amount numeric;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS quote_sent_at date;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS decision_due_at date;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS is_large_job boolean;

-- Backfill job size from the originating lead where we have one.
UPDATE bids b
SET is_large_job = l.is_large_job
FROM leads l
WHERE b.lead_id = l.id AND b.is_large_job IS NULL;
