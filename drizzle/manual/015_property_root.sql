-- 015_property_root.sql
-- Phase 1 of the property-rooted re-model (2026-05-29 Jordan/AQP session).
-- Makes the property the legally-aware root: accounts gain an owner vs.
-- management-company type, properties gain explicit owner/management account
-- links, and a new property_parties table captures who owns / who manages /
-- which contact maps to which, plus the Notice-to-Owner recipient (serving
-- the manager instead of the owner forfeits lien rights).
-- Additive only; legacy properties.account_id stays readable during transition.
-- See docs/build-plans/property_rooted_remodel.plan.md and docs/plan.md.

-- Accounts: owner | management_company | other (existing rows are managers).
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'management_company';

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('management_company', 'owner', 'other'));

-- Properties: explicit owner vs. management company (both nullable FK accounts).
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS management_account_id uuid REFERENCES accounts(id);
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS owner_account_id uuid REFERENCES accounts(id);

-- Backfill: the legacy single account link was the management company.
UPDATE properties
  SET management_account_id = account_id
  WHERE management_account_id IS NULL AND account_id IS NOT NULL;

-- Party mapping incl. the NTO recipient and free-text legal owner fallback.
CREATE TABLE IF NOT EXISTS property_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (
    role IN ('owner', 'management_company', 'billing', 'nto_recipient', 'other')
  ),
  is_nto_recipient boolean NOT NULL DEFAULT false,
  legal_owner_name text,
  legal_owner_address text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_parties_property_idx
  ON property_parties (user_id, property_id);

-- At most one NTO recipient per property.
CREATE UNIQUE INDEX IF NOT EXISTS property_parties_one_nto_per_property_idx
  ON property_parties (property_id)
  WHERE is_nto_recipient;
