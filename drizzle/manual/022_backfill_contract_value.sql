-- 022_backfill_contract_value.sql
-- Backfill bids.contract_value for jobs that were won BEFORE the money layer
-- (021) added the column. Source = the latest proposal's snapshot grand total
-- per bid. Idempotent: only fills rows where contract_value is still null.
-- New acceptances stamp it live (see respondToProposalShare).

UPDATE bids b
SET contract_value = sub.total
FROM (
  SELECT DISTINCT ON (p.bid_id)
    p.bid_id,
    COALESCE(
      (p.snapshot ->> 'grandTotal'),
      (p.snapshot -> 'pricing' ->> 'grandTotal')
    )::numeric AS total
  FROM proposals p
  ORDER BY p.bid_id, p.created_at DESC
) sub
WHERE b.id = sub.bid_id
  AND b.status = 'won'
  AND b.contract_value IS NULL
  AND sub.total IS NOT NULL;
