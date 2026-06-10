-- 029_job_schedule.sql
-- AQP reconciliation, Phase 5 (job-page schedule progress):
--   weeks_total / current_week     — large-job weeks grid
--   days_total / current_day       — small-job day strip
--   buildings_done                 — large-job buildings progress
--                                    (buildings_total derives from the bid's
--                                    buildings rows — never stored)
--   delivery_status gains 'warranty_watch' (post-complete monitoring, per
--   AQP's job lifecycle).
-- See docs/build-plans/aqp_reconciliation.plan.md.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

ALTER TABLE bids ADD COLUMN IF NOT EXISTS weeks_total integer;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS current_week integer;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS days_total integer;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS current_day integer;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS buildings_done integer;

ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_delivery_status_check;
ALTER TABLE bids ADD CONSTRAINT bids_delivery_status_check CHECK (
  delivery_status IS NULL
  OR delivery_status IN (
    'not_started',
    'in_progress',
    'punch_out',
    'complete',
    'warranty_watch',
    'on_hold'
  )
);
