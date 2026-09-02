-- 045_lists.sql
-- Jordan 2026-09-02: "We need lists, still, which is just raw CSV of people
-- ... the list is unrelated object to anything else, lives on its own ...
-- a convert button, and you just convert that person from the list to a lead."
-- A List is an inert container of people. Nothing is minted (no contact,
-- property, account, or lead) until a row is explicitly converted.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  source_tag text,
  file_name text,
  row_count integer NOT NULL DEFAULT 0,
  mapping jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lists_user_idx ON lists (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS list_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  property_name text,
  address text,
  raw_row jsonb,
  converted_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS list_rows_list_idx ON list_rows (list_id, position);
CREATE INDEX IF NOT EXISTS list_rows_user_idx ON list_rows (user_id);
