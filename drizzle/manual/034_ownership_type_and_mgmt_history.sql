-- 034_ownership_type_and_mgmt_history.sql
-- Jordan's software fix list (2026-07-13), items #4 and #5.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

-- #4: HOA/condo association properties have no individual owner, so the
-- Ownership card's owner contact sat at "Not set" with no valid choice.
-- ownership_type on the `owner` property_parties row records which shape
-- applies; 'hoa' means the association itself is the owner and no contact
-- is expected.
ALTER TABLE property_parties
  ADD COLUMN IF NOT EXISTS ownership_type text NOT NULL DEFAULT 'individual';
ALTER TABLE property_parties
  DROP CONSTRAINT IF EXISTS property_parties_ownership_type_check;
ALTER TABLE property_parties
  ADD CONSTRAINT property_parties_ownership_type_check
  CHECK (ownership_type IN ('individual', 'hoa'));

-- #5 (root of the "Relationship History can't record" report): leads create
-- properties with management_account_id set but no dated property_mgmt row,
-- so Relationship History showed "None recorded" directly under a card
-- naming the current management company. Backfill a current relationship
-- for every property in that state, dated from the property's creation.
INSERT INTO property_mgmt (user_id, property_id, account_id, start_date)
SELECT p.user_id, p.id, p.management_account_id, p.created_at::date
FROM properties p
WHERE p.management_account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM property_mgmt m WHERE m.property_id = p.id
  );
