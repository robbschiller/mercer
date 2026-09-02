-- 044_property_name_required.sql
-- Jordan 2026-09-02: "there's never a time where we do something where
-- there's not a name, or the address." Every property carries a name.
-- Backfill placeholders from the address so the constraint can land;
-- intake replaces an address-as-name placeholder the next time someone
-- types the real community name (see findOrCreateProperty).
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

UPDATE properties
SET name = coalesce(nullif(btrim(address), ''), 'Unnamed property'),
    updated_at = now()
WHERE name IS NULL OR btrim(name) = '';

ALTER TABLE properties ALTER COLUMN name SET NOT NULL;
