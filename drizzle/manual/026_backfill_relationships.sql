-- 026_backfill_relationships.sql
-- Seed the dated relationship tables (025) from the existing current-state FKs
-- so every property/contact starts with one "current" relationship row. Uses
-- created_at as the start_date (best-effort historical anchor). Idempotent: the
-- NOT EXISTS guards skip properties/contacts that already have a current row.

-- Management: prefer management_account_id, fall back to legacy account_id.
INSERT INTO property_mgmt (user_id, property_id, account_id, start_date)
SELECT p.user_id, p.id, COALESCE(p.management_account_id, p.account_id),
       p.created_at::date
FROM properties p
WHERE COALESCE(p.management_account_id, p.account_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM property_mgmt m
    WHERE m.property_id = p.id AND m.end_date IS NULL
  );

-- Owner.
INSERT INTO property_owner (user_id, property_id, account_id, start_date)
SELECT p.user_id, p.id, p.owner_account_id, p.created_at::date
FROM properties p
WHERE p.owner_account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM property_owner o
    WHERE o.property_id = p.id AND o.end_date IS NULL
  );

-- Contact employment (current employer).
INSERT INTO contact_employment (user_id, contact_id, account_id, title, start_date)
SELECT c.user_id, c.id, c.account_id, c.title, c.created_at::date
FROM contacts c
WHERE c.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contact_employment e
    WHERE e.contact_id = c.id AND e.account_id = c.account_id AND e.end_date IS NULL
  );
