-- 032_quote_engine.sql
-- AI Quote Engine (Jordan's AQP engineering notes §6): versioned quotes +
-- first-class quote lines with provenance.
--
--   proposals      → version (v1/v2/v3 per bid) + AI-written change_log +
--                    the scope_text the draft was generated from
--   proposal_shares → view_count ("Viewed 4×" in version history)
--   line_items     → qty × unit_price structure (amount stays the stored
--                    total so every existing sum keeps working), catalog
--                    linkage (price_list_item_id + sku snapshot), category
--                    grouping, and AI provenance: source, confidence,
--                    evidence photo, rationale, flag note
--
-- See docs/build-plans (quote engine) + claude.ai/design project d3b4b34a.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

-- ── proposals: versioning ──
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS version integer;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS change_log text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS scope_text text;

-- Backfill version per bid in creation order (existing proposals become v1, v2, …)
UPDATE proposals p
SET version = n.version
FROM (
  SELECT id,
    row_number() OVER (PARTITION BY bid_id ORDER BY created_at, id)::int AS version
  FROM proposals
) n
WHERE p.id = n.id AND p.version IS NULL;

ALTER TABLE proposals ALTER COLUMN version SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS proposals_bid_version_idx
  ON proposals (bid_id, version);

-- ── proposal_shares: view counting ──
ALTER TABLE proposal_shares ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
-- Shares that have been accessed at least once count as 1 view
UPDATE proposal_shares SET view_count = 1
WHERE accessed_at IS NOT NULL AND view_count = 0;

-- ── price list categories: cover Jordan's itemized lists + quote groups ──
-- (stucco repair, railings, staging & access were missing from 027's enum)
ALTER TABLE price_list_items DROP CONSTRAINT IF EXISTS price_list_items_category_check;
ALTER TABLE price_list_items ADD CONSTRAINT price_list_items_category_check
  CHECK (category IN (
    'painting','pressure_washing','wood_repair','stucco','stair_systems',
    'railings','caulking','gutters','access','other'
  ));

-- ── line_items: quote-line structure + provenance ──
-- qty/unit/unit_price are nullable: legacy lines stay amount-only. When
-- present, the app maintains amount = qty * unit_price on every edit.
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS qty numeric;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS unit_price numeric;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS category text
  CHECK (category IN (
    'painting','pressure_washing','wood_repair','stucco','stair_systems',
    'railings','caulking','gutters','access','other'
  ));
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS price_list_item_id uuid
  REFERENCES price_list_items(id) ON DELETE SET NULL;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS sku text;

-- Provenance: who put this line here, and why should the salesperson trust it
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('ai', 'catalog', 'manual'));
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS confidence text
  CHECK (confidence IN ('high', 'low'));
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS evidence_photo_id uuid
  REFERENCES photos(id) ON DELETE SET NULL;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS ai_rationale text;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS flag_note text;
