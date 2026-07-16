-- 041_takeoff_stage_merge.sql
-- Jordan field pass C6: "Needs takeoff" and "Takeoff scheduled" merge into a
-- single `takeoff` stage. Whether the site walk is booked is data on the lead
-- (takeoff_scheduled_at), not a separate stage — so a lead can never straddle
-- the two and double-count in the pipeline (A1).
--   takeoff → quoted → won / lost / no_response / on_hold / expired
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

UPDATE leads SET status = 'takeoff'
  WHERE status IN ('needs_takeoff', 'takeoff_scheduled');

ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'takeoff';

ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'takeoff',
  'quoted',
  'won',
  'lost',
  'no_response',
  'on_hold',
  'expired'
));

-- Rebuild the takeoff-queue partial index around the merged stage.
DROP INDEX IF EXISTS leads_takeoff_queue_idx;
CREATE INDEX IF NOT EXISTS leads_takeoff_queue_idx
  ON leads (user_id, status)
  WHERE status = 'takeoff';
