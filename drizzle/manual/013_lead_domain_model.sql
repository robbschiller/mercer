-- Additive lead-domain model: accounts, properties, contacts, opportunity
-- links, timeline events, and structured audit records. Existing flat lead
-- columns remain as compatibility fields while screens migrate.

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  website text,
  source_tag text,
  status text NOT NULL DEFAULT 'active',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES accounts(id),
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  google_place_id text,
  satellite_image_url text,
  enrichment_status text CHECK (
    enrichment_status IS NULL OR enrichment_status IN ('pending','success','failed','skipped')
  ),
  enrichment_error text,
  source_tag text,
  raw_source jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES accounts(id),
  name text NOT NULL,
  email text,
  phone text,
  title text,
  source_tag text,
  relationship_tier text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role text,
  decision_influence text,
  source_tag text,
  import_ref jsonb,
  active boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  notes text NOT NULL DEFAULT ''
);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id),
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES contacts(id),
  ADD COLUMN IF NOT EXISTS qualification_status text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualification_brief text;

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id),
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES contacts(id);

CREATE TABLE IF NOT EXISTS lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  property_contact_id uuid REFERENCES property_contacts(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'primary',
  is_primary boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  bid_id uuid REFERENCES bids(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  changed_fields jsonb,
  previous_values jsonb,
  new_values jsonb,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_name_unique_idx
  ON accounts (user_id, lower(btrim(name)))
  WHERE btrim(name) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_email_unique_idx
  ON contacts (user_id, lower(btrim(email)))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE INDEX IF NOT EXISTS contacts_user_phone_idx
  ON contacts (user_id, phone)
  WHERE phone IS NOT NULL AND btrim(phone) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS properties_user_address_unique_idx
  ON properties (user_id, lower(btrim(address)))
  WHERE address IS NOT NULL AND btrim(address) <> '';

CREATE INDEX IF NOT EXISTS properties_user_account_idx
  ON properties (user_id, account_id);

CREATE UNIQUE INDEX IF NOT EXISTS property_contacts_unique_idx
  ON property_contacts (user_id, property_id, contact_id);

CREATE UNIQUE INDEX IF NOT EXISTS lead_contacts_unique_idx
  ON lead_contacts (user_id, lead_id, contact_id);

CREATE INDEX IF NOT EXISTS leads_user_property_idx
  ON leads (user_id, property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_active_property_idx
  ON leads (user_id, property_id)
  WHERE property_id IS NOT NULL AND closed_at IS NULL AND status NOT IN ('won', 'lost');

CREATE INDEX IF NOT EXISTS bids_user_property_idx
  ON bids (user_id, property_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS activity_events_lead_time_idx
  ON activity_events (user_id, lead_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS activity_events_contact_time_idx
  ON activity_events (user_id, contact_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON audit_log (user_id, entity_type, entity_id, created_at DESC);

WITH legacy_accounts AS (
  SELECT DISTINCT ON (user_id, lower(btrim(company)))
    user_id,
    btrim(company) AS name,
    source_tag,
    created_at,
    updated_at
  FROM leads
  WHERE company IS NOT NULL AND btrim(company) <> ''
  ORDER BY user_id, lower(btrim(company)), created_at
)
INSERT INTO accounts (user_id, name, source_tag, created_at, updated_at)
SELECT user_id, name, source_tag, created_at, updated_at
FROM legacy_accounts
ON CONFLICT DO NOTHING;

WITH legacy_contacts AS (
  SELECT DISTINCT ON (
    l.user_id,
    coalesce(lower(nullif(btrim(l.email), '')), nullif(btrim(l.phone), ''), lower(btrim(l.name)))
  )
    l.user_id,
    a.id AS account_id,
    l.name,
    nullif(btrim(l.email), '') AS email,
    nullif(btrim(l.phone), '') AS phone,
    l.source_tag,
    l.notes,
    l.created_at,
    l.updated_at
  FROM leads l
  LEFT JOIN accounts a
    ON a.user_id = l.user_id
   AND lower(btrim(a.name)) = lower(btrim(l.company))
  WHERE btrim(l.name) <> ''
  ORDER BY
    l.user_id,
    coalesce(lower(nullif(btrim(l.email), '')), nullif(btrim(l.phone), ''), lower(btrim(l.name))),
    l.created_at
)
INSERT INTO contacts (user_id, account_id, name, email, phone, source_tag, notes, created_at, updated_at)
SELECT user_id, account_id, name, email, phone, source_tag, notes, created_at, updated_at
FROM legacy_contacts
ON CONFLICT DO NOTHING;

WITH legacy_properties AS (
  SELECT DISTINCT ON (
    l.user_id,
    coalesce(lower(nullif(btrim(l.resolved_address), '')), lower(nullif(btrim(l.property_name), '')), l.id::text)
  )
    l.user_id,
    a.id AS account_id,
    nullif(btrim(l.property_name), '') AS name,
    nullif(btrim(l.resolved_address), '') AS address,
    l.latitude,
    l.longitude,
    l.google_place_id,
    l.satellite_image_url,
    l.enrichment_status,
    l.enrichment_error,
    l.source_tag,
    l.raw_row AS raw_source,
    l.notes,
    l.created_at,
    l.updated_at
  FROM leads l
  LEFT JOIN accounts a
    ON a.user_id = l.user_id
   AND lower(btrim(a.name)) = lower(btrim(l.company))
  ORDER BY
    l.user_id,
    coalesce(lower(nullif(btrim(l.resolved_address), '')), lower(nullif(btrim(l.property_name), '')), l.id::text),
    l.created_at
)
INSERT INTO properties (
  user_id, account_id, name, address, latitude, longitude, google_place_id,
  satellite_image_url, enrichment_status, enrichment_error, source_tag,
  raw_source, notes, created_at, updated_at
)
SELECT
  user_id, account_id, name, address, latitude, longitude, google_place_id,
  satellite_image_url, enrichment_status, enrichment_error, source_tag,
  raw_source, notes, created_at, updated_at
FROM legacy_properties
ON CONFLICT DO NOTHING;

UPDATE leads l
SET
  account_id = (
    SELECT a.id
    FROM accounts a
    WHERE a.user_id = l.user_id
      AND l.company IS NOT NULL
      AND lower(btrim(a.name)) = lower(btrim(l.company))
    LIMIT 1
  ),
  primary_contact_id = (
    SELECT c.id
    FROM contacts c
    WHERE c.user_id = l.user_id
      AND (
        (l.email IS NOT NULL AND c.email IS NOT NULL AND lower(btrim(c.email)) = lower(btrim(l.email)))
        OR (
          (l.email IS NULL OR btrim(l.email) = '')
          AND l.phone IS NOT NULL
          AND c.phone IS NOT NULL
          AND btrim(c.phone) = btrim(l.phone)
        )
        OR (
          (l.email IS NULL OR btrim(l.email) = '')
          AND (l.phone IS NULL OR btrim(l.phone) = '')
          AND lower(btrim(c.name)) = lower(btrim(l.name))
        )
      )
    ORDER BY c.created_at
    LIMIT 1
  ),
  property_id = (
    SELECT p.id
    FROM properties p
    WHERE p.user_id = l.user_id
      AND (
        (l.resolved_address IS NOT NULL AND p.address IS NOT NULL AND lower(btrim(p.address)) = lower(btrim(l.resolved_address)))
        OR (
          (l.resolved_address IS NULL OR btrim(l.resolved_address) = '')
          AND l.property_name IS NOT NULL
          AND p.name IS NOT NULL
          AND lower(btrim(p.name)) = lower(btrim(l.property_name))
        )
      )
    ORDER BY p.created_at
    LIMIT 1
  ),
  opened_at = coalesce(l.opened_at, l.created_at),
  closed_at = CASE
    WHEN l.status IN ('won', 'lost') THEN coalesce(l.closed_at, l.updated_at)
    ELSE l.closed_at
  END
WHERE l.property_id IS NULL
   OR l.account_id IS NULL
   OR l.primary_contact_id IS NULL;

INSERT INTO property_contacts (
  user_id, property_id, contact_id, role, source_tag, import_ref, first_seen_at, last_seen_at, notes
)
SELECT DISTINCT ON (l.user_id, l.property_id, l.primary_contact_id)
  l.user_id,
  l.property_id,
  l.primary_contact_id,
  coalesce(l.raw_row->>'Role with Company', l.raw_row->>'Role', l.raw_row->>'Title'),
  l.source_tag,
  l.raw_row,
  l.created_at,
  l.updated_at,
  ''
FROM leads l
WHERE l.property_id IS NOT NULL AND l.primary_contact_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO lead_contacts (user_id, lead_id, contact_id, property_contact_id, role, is_primary, created_at)
SELECT
  l.user_id,
  l.id,
  l.primary_contact_id,
  pc.id,
  'primary',
  true,
  l.created_at
FROM leads l
LEFT JOIN property_contacts pc
  ON pc.user_id = l.user_id
 AND pc.property_id = l.property_id
 AND pc.contact_id = l.primary_contact_id
WHERE l.primary_contact_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO activity_events (
  user_id, lead_id, contact_id, property_id, account_id, type, title, body, occurred_at, metadata, created_at
)
SELECT
  l.user_id,
  l.id,
  l.primary_contact_id,
  l.property_id,
  l.account_id,
  'import',
  'Lead imported',
  coalesce(l.notes, ''),
  l.created_at,
  jsonb_build_object('source_tag', l.source_tag),
  l.created_at
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM activity_events ae
  WHERE ae.lead_id = l.id AND ae.type = 'import'
);

INSERT INTO activity_events (
  user_id, lead_id, contact_id, property_id, account_id, type, title, body, occurred_at, created_at
)
SELECT
  l.user_id,
  l.id,
  l.primary_contact_id,
  l.property_id,
  l.account_id,
  'call',
  'Contact attempt logged',
  '',
  l.last_contacted_at,
  l.last_contacted_at
FROM leads l
WHERE l.last_contacted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activity_events ae
    WHERE ae.lead_id = l.id AND ae.type = 'call' AND ae.occurred_at = l.last_contacted_at
  );

UPDATE bids b
SET
  property_id = coalesce(b.property_id, l.property_id),
  primary_contact_id = coalesce(b.primary_contact_id, l.primary_contact_id)
FROM leads l
WHERE b.lead_id = l.id
  AND b.user_id = l.user_id
  AND (b.property_id IS NULL OR b.primary_contact_id IS NULL);

INSERT INTO audit_log (
  user_id, entity_type, entity_id, action, changed_fields, new_values, source, created_at
)
SELECT
  l.user_id,
  'lead',
  l.id,
  'backfill',
  '["property_id","account_id","primary_contact_id"]'::jsonb,
  jsonb_build_object(
    'property_id', l.property_id,
    'account_id', l.account_id,
    'primary_contact_id', l.primary_contact_id
  ),
  'migration',
  now()
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log al
  WHERE al.entity_type = 'lead'
    AND al.entity_id = l.id
    AND al.action = 'backfill'
);
