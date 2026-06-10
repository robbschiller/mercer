-- 028_lead_status_expansion.sql
-- AQP reconciliation, Phase 4 (the pass deferred from 024): expand the lead
-- pipeline to AQP's operating flow.
--   needs_takeoff → takeoff_scheduled → quoted → won / lost / no_response /
--   on_hold / expired
-- `quoted`/`won`/`lost` keep their values (bid-create + proposal-accept write
-- paths untouched); the retired `new` maps to `needs_takeoff`.
-- Also adds leads.takeoff_scheduled_at (when the takeoff visit is booked).
-- See docs/build-plans/aqp_reconciliation.plan.md.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

UPDATE leads SET status = 'needs_takeoff' WHERE status = 'new';

ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'needs_takeoff';

ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'needs_takeoff',
  'takeoff_scheduled',
  'quoted',
  'won',
  'lost',
  'no_response',
  'on_hold',
  'expired'
));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS takeoff_scheduled_at timestamptz;

-- The takeoff queue reads open takeoff-stage leads per org.
CREATE INDEX IF NOT EXISTS leads_takeoff_queue_idx
  ON leads (user_id, status)
  WHERE status IN ('needs_takeoff', 'takeoff_scheduled');
