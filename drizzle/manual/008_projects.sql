-- 008_projects.sql
-- Phase 1 project layer, Slice 1: bid-to-project handoff.
-- Additive only. One project per bid (UNIQUE bid_id supports
-- ON CONFLICT DO NOTHING idempotency in respondToProposalShare).
-- See docs/prd.md §5.5 / §6.3.

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL UNIQUE REFERENCES bids(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  target_start_date date,
  target_end_date date,
  actual_start_date timestamptz,
  actual_end_date timestamptz,
  assigned_sub text,
  crew_lead_name text,
  accepted_by_name text,
  accepted_by_title text,
  accepted_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx
  ON projects (user_id, updated_at DESC);
