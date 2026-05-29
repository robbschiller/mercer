-- 016_scope_access.sql
-- Phase 2 of the property-rooted re-model: scope gains an access dimension
-- and buildings gain an archetype. Access (lifts, scaffold, swing stage,
-- safety) scales by height/archetype, not square footage (swing stage on a
-- tall building can run ~$80k), so it is a sibling to surfaces — not folded
-- into them. `bid_id` re-parents to the project spine in Phase 3.
-- Additive only. See docs/build-plans/property_rooted_remodel.plan.md.

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS archetype text;

ALTER TABLE buildings DROP CONSTRAINT IF EXISTS buildings_archetype_check;
ALTER TABLE buildings
  ADD CONSTRAINT buildings_archetype_check
  CHECK (
    archetype IS NULL
    OR archetype IN ('garden', 'townhome', 'mid_rise', 'high_rise', 'other')
  );

CREATE TABLE IF NOT EXISTS access_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (
    type IN ('lift', 'scaffold', 'swing_stage', 'safety', 'other')
  ),
  method text,
  quantity numeric,
  duration_days integer,
  amount numeric NOT NULL DEFAULT '0',
  rate_derived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_items_bid_idx ON access_items (bid_id);
