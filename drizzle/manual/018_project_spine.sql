-- 018_project_spine.sql
-- Phase 3, Stage 1 of the property-rooted re-model: collapse bids + the
-- separate delivery `projects` table onto ONE property-rooted spine. The bid
-- row becomes the project (the scoped opportunity), so a property can carry
-- many projects (Pura Vita: blue-section vs whole-building), only one of which
-- proceeds. This migration is ADDITIVE: it folds the delivery fields that
-- lived on `projects` (created only on acceptance) onto `bids` and backfills
-- them. The code cutover (Stage 2) and the destructive drop of `projects`
-- (Stage 3 / 019) follow. Decision Option A, locked 2026-05-29.
-- See docs/build-plans/property_rooted_remodel.plan.md.

-- A human label for the scoped opportunity (e.g. "Blue section", "Whole building").
ALTER TABLE bids ADD COLUMN IF NOT EXISTS label text;

-- Delivery phase — null until the opportunity is won, then runs the project
-- state machine. The opportunity status stays on bids.status (draft/sent/won/
-- lost); delivery_status replaces the old projects.status.
ALTER TABLE bids ADD COLUMN IF NOT EXISTS delivery_status text;
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_delivery_status_check;
ALTER TABLE bids ADD CONSTRAINT bids_delivery_status_check CHECK (
  delivery_status IS NULL
  OR delivery_status IN ('not_started', 'in_progress', 'punch_out', 'complete', 'on_hold')
);

ALTER TABLE bids ADD COLUMN IF NOT EXISTS target_start_date date;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS target_end_date date;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS actual_start_date timestamptz;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS actual_end_date timestamptz;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS assigned_sub text;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS crew_lead_name text;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS accepted_by_name text;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS accepted_by_title text;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS delivery_notes text NOT NULL DEFAULT '';

-- Backfill the delivery fields from the existing 1:1 projects rows.
UPDATE bids b SET
  delivery_status = p.status,
  target_start_date = p.target_start_date,
  target_end_date = p.target_end_date,
  actual_start_date = p.actual_start_date,
  actual_end_date = p.actual_end_date,
  assigned_sub = p.assigned_sub,
  crew_lead_name = p.crew_lead_name,
  accepted_by_name = p.accepted_by_name,
  accepted_by_title = p.accepted_by_title,
  accepted_at = p.accepted_at,
  delivery_notes = COALESCE(p.notes, '')
FROM projects p
WHERE p.bid_id = b.id;

-- Re-parent the update feed onto the bid spine (keep project_id during the
-- transition so the old code keeps working until Stage 2 cutover).
ALTER TABLE project_updates
  ADD COLUMN IF NOT EXISTS bid_id uuid REFERENCES bids(id) ON DELETE CASCADE;
UPDATE project_updates pu SET bid_id = p.bid_id
  FROM projects p
  WHERE pu.project_id = p.id AND pu.bid_id IS NULL;
CREATE INDEX IF NOT EXISTS project_updates_bid_idx ON project_updates (bid_id);
