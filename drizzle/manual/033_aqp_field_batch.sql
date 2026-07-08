-- 033_aqp_field_batch.sql
-- Field batch from Jordan's AQP engineering notes (2026-07). Mechanical
-- spec-compliance adds:
--   properties → attainable sqft (non-floor / floors), breezeway and
--                stair-system counts, maintenance history notes (§3)
--   contacts   → preferred communication method (§4)
--   bids       → invoicing contact ("so AP knows who to bill", §7)
--   expenses   → housing + mobilization categories (§7d)
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).
-- Apply AFTER 032_quote_engine.sql.

-- ── properties (§3) ──
-- "Attainable" = surface area a crew could actually be sold on, split the
-- way AQP prices: non-floor surfaces vs. floors. Exact field naming is an
-- open item in Jordan's notes (§9) — column names are ours, labels can churn.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS attainable_sqft_nonfloor numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS attainable_sqft_floors numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS breezeway_count integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS stair_system_count integer;
-- Things crews should know before arriving (known issues, access quirks).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_notes text NOT NULL DEFAULT '';

-- ── contacts (§4) ──
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_method text
  CHECK (preferred_contact_method IN ('email', 'phone', 'text'));

-- ── bids (§7) ──
ALTER TABLE bids ADD COLUMN IF NOT EXISTS invoicing_contact_id uuid
  REFERENCES contacts(id) ON DELETE SET NULL;

-- ── expenses (§7d): Jordan's categories Housing + Mobilization ──
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'staging','lifts','primer_sealer','topcoat','metal_paint_primer',
    'floor_paint','supplies','caulk','patch','cleaners','misc_supplies',
    'travel','repairs','non_paint_labor','paint_labor',
    'housing','mobilization','other'
  ));
