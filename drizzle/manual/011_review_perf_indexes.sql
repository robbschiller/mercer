-- Follow-up indexes from the review/perf pass.
-- Additive only: supports stable lead pagination, property-group ordering,
-- and project list filtering without changing table shape.

CREATE INDEX IF NOT EXISTS leads_user_id_created_at_id_idx
  ON leads (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS leads_user_id_resolved_address_idx
  ON leads (user_id, lower(nullif(btrim(resolved_address), '')));

CREATE INDEX IF NOT EXISTS projects_user_id_status_updated_at_idx
  ON projects (user_id, status, updated_at DESC, id DESC);
