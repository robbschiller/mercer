-- 031_photos.sql
-- AQP reconciliation: polymorphic photo archive. One table for every photo
-- in the system, attached to its context by (context_type, context_id) —
-- lead intake shots, bid/takeoff documentation, project progress/completion,
-- damage. Files live in the public `photos` storage bucket (same pattern as
-- `proposals`); the row keeps the storage path + public URL.
-- See docs/build-plans/aqp_reconciliation.plan.md.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  context_type text NOT NULL CHECK (context_type IN ('lead', 'bid', 'property')),
  context_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN (
    'intake', 'takeoff', 'progress', 'completion', 'damage', 'other'
  )),
  storage_path text NOT NULL,
  url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_context_idx
  ON photos (user_id, context_type, context_id);

-- Storage bucket + policies, mirroring the `proposals` bucket (public read,
-- authenticated upload) plus delete (photos, unlike proposals, are removable).
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "Public read access photos" ON storage.objects;
CREATE POLICY "Public read access photos"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos');
