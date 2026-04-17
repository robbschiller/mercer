-- Applied by `bun run db:apply-manual` when `drizzle-kit push` fails (Supabase introspection bug).

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_tag text,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  property_name text,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','won','lost')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads (user_id);
CREATE INDEX IF NOT EXISTS leads_user_id_created_at_idx ON leads (user_id, created_at DESC);
