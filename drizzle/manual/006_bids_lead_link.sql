-- Applied by `bun run db:apply-manual`.
-- Links bids back to originating leads for lead-to-close lifecycle tracking.

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS lead_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bids_lead_id_fkey'
  ) THEN
    ALTER TABLE bids
      ADD CONSTRAINT bids_lead_id_fkey
      FOREIGN KEY (lead_id)
      REFERENCES leads(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bids_lead_id_idx
  ON bids (lead_id);
