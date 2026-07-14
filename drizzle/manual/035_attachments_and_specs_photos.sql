-- 035_attachments_and_specs_photos.sql
-- Jordan's software fix list (2026-07-13), items #1 and #6.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

-- #1: file attachments (paint specs, RFPs, referral emails) on leads.
-- Same polymorphic (context_type, context_id) shape as photos so bids and
-- properties can carry documents later without another migration.
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  context_type text NOT NULL CHECK (context_type IN ('lead', 'bid', 'property')),
  context_id uuid NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  storage_path text NOT NULL,
  url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attachments_context_idx
  ON attachments (user_id, context_type, context_id);

-- Storage bucket + policies, mirroring the `photos` bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Public read access attachments" ON storage.objects;
CREATE POLICY "Public read access attachments"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');

-- #6: photos attached from the Property Specs section carry kind='specs'.
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_kind_check;
ALTER TABLE photos ADD CONSTRAINT photos_kind_check CHECK (kind IN (
  'intake', 'takeoff', 'progress', 'completion', 'damage', 'specs', 'other'
));
