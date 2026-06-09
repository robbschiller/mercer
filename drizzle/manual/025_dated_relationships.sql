-- 025_dated_relationships.sql
-- AQP reconciliation, Phase 2b. Relationships have time (principle #2):
-- property↔management, property↔owner, and contact↔company become dated tables
-- (start/end), not just current-state FKs. end_date null = current; a partial
-- unique index enforces one current mgmt/owner per property. The existing
-- current-state FKs (properties.management_account_id / owner_account_id,
-- contacts.account_id) are kept as derived convenience.
-- See docs/build-plans/aqp_reconciliation.plan.md.

CREATE TABLE IF NOT EXISTS property_mgmt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_current_mgmt ON property_mgmt(property_id) WHERE end_date IS NULL;
CREATE INDEX IF NOT EXISTS property_mgmt_current_idx ON property_mgmt(property_id, end_date);

CREATE TABLE IF NOT EXISTS property_owner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_current_owner ON property_owner(property_id) WHERE end_date IS NULL;
CREATE INDEX IF NOT EXISTS property_owner_current_idx ON property_owner(property_id, end_date);

CREATE TABLE IF NOT EXISTS contact_employment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title text,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_employment_current_idx ON contact_employment(account_id, end_date);
CREATE INDEX IF NOT EXISTS contact_employment_contact_idx ON contact_employment(contact_id);
