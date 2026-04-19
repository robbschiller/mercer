-- 009_project_updates.sql
-- Phase 1 project layer, Slice 3: project_updates feed + public
-- status-page pivot at /p/[slug] post-acceptance.
-- Additive only. visible_on_public_url defaults to false so updates are
-- internal until the contractor explicitly opts a row in.
-- See docs/prd.md §5.5 / §6.3.1.

CREATE TABLE IF NOT EXISTS project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'human',
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  attachments_ref jsonb,
  visible_on_public_url boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Detail-page feed query: project_updates for a project, newest first.
CREATE INDEX IF NOT EXISTS project_updates_project_id_created_at_idx
  ON project_updates (project_id, created_at DESC);

-- Public status-page query: only the rows opted-in for the property
-- manager. Partial index keeps the public read narrow.
CREATE INDEX IF NOT EXISTS project_updates_public_idx
  ON project_updates (project_id, created_at DESC)
  WHERE visible_on_public_url = true;
