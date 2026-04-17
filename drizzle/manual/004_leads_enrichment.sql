-- Applied by `bun run db:apply-manual`. Adds enrichment fields to leads so the
-- Places-based enrichment worker can persist results. See docs/worklog.md
-- (2026-04-16 Phase A) and docs/plan.md §Data Model Changes.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS resolved_address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS satellite_image_url text,
  ADD COLUMN IF NOT EXISTS enrichment_status text
    CHECK (enrichment_status IN ('pending','success','failed','skipped')),
  ADD COLUMN IF NOT EXISTS enrichment_error text,
  ADD COLUMN IF NOT EXISTS raw_row jsonb;

CREATE INDEX IF NOT EXISTS leads_user_id_source_tag_idx
  ON leads (user_id, source_tag);
CREATE INDEX IF NOT EXISTS leads_enrichment_status_idx
  ON leads (enrichment_status)
  WHERE enrichment_status = 'pending';
