-- 042_tasks.sql
-- Jordan field pass C7: saving a follow-up date creates a task for a chosen
-- member (no silent default). Tasks are tenant-scoped by user_id (the org
-- owner, as everywhere) and targeted per-person via assigned_to_user_id —
-- the first per-user-targeted surface (the bell/agenda were org-wide).
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assigned_to_user_id uuid NOT NULL,
  created_by_user_id uuid,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  bid_id uuid REFERENCES bids(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'follow_up',
  title text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_assignee_idx
  ON tasks (assigned_to_user_id, status, due_date);
CREATE INDEX IF NOT EXISTS tasks_lead_open_idx
  ON tasks (lead_id) WHERE status = 'open';
