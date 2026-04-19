-- Applied by `bun run db:apply-manual`.
-- Adds composite + foreign-key indexes aligned to the queries in src/lib/store.ts.
-- Postgres does NOT auto-index foreign-key columns, so most child-table joins
-- (buildings -> bids, surfaces -> buildings, line_items -> bids, etc.) were
-- doing sequential scans. These indexes back the most common patterns:
--   * getBids / getBidsWithSummary       -> bids(user_id, updated_at desc)
--   * getBidPageData child loads         -> buildings(bid_id), surfaces(building_id), line_items(bid_id)
--   * proposal latest-by-bid (DISTINCT ON / orderBy createdAt desc)
--                                        -> proposals(bid_id, created_at desc)

CREATE INDEX IF NOT EXISTS bids_user_id_updated_at_idx
  ON bids (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS buildings_bid_id_idx
  ON buildings (bid_id);

CREATE INDEX IF NOT EXISTS surfaces_building_id_idx
  ON surfaces (building_id);

CREATE INDEX IF NOT EXISTS line_items_bid_id_idx
  ON line_items (bid_id);

CREATE INDEX IF NOT EXISTS proposals_bid_id_created_at_idx
  ON proposals (bid_id, created_at DESC);
