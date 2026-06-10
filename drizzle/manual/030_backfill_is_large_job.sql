-- 030_backfill_is_large_job.sql
-- Backfill leads.is_large_job for pre-Phase-2a leads (the column landed in
-- 024 with DEFAULT false and was never backfilled, so old large jobs render
-- the small-job day strip). Heuristic proxy for AQP's 2-week rule:
--   large if any bid from the lead has 2+ buildings (sum of per-row counts)
--   or the contract/estimated value is >= $50k.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

WITH lead_bids AS (
  SELECT b.lead_id,
         max(coalesce(b.contract_value::numeric, 0)) AS max_contract,
         max((SELECT coalesce(sum(count), 0) FROM buildings WHERE bid_id = b.id)) AS max_bldgs
  FROM bids b
  WHERE b.lead_id IS NOT NULL
  GROUP BY b.lead_id
)
UPDATE leads l
SET is_large_job = true, updated_at = now()
FROM lead_bids lb
WHERE lb.lead_id = l.id
  AND NOT l.is_large_job
  AND (
    coalesce(lb.max_bldgs, 0) >= 2
    OR greatest(coalesce(lb.max_contract, 0), coalesce(l.est_value::numeric, 0)) >= 50000
  );
