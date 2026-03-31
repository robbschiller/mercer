-- Applied by `bun run db:apply-manual` when `drizzle-kit push` fails (Supabase introspection bug).
-- See https://github.com/drizzle-team/drizzle-orm/issues/3766

ALTER TABLE bids ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS google_place_id text;
