-- 047_list_row_contact.sql
-- Robb 2026-09-17: "when I'm looking at people in the table on a list view,
-- I want to see the last time I contacted them and allow me to add and edit
-- it from the table." Outreach happens from the list before anyone is
-- converted, so the row itself remembers the last touch and how many tries.
-- Converting carries both onto the lead.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

ALTER TABLE list_rows ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE list_rows ADD COLUMN IF NOT EXISTS contact_attempts integer NOT NULL DEFAULT 0;
