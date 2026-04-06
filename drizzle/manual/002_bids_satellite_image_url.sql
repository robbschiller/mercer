-- Satellite proxy path for Maps Static API (see src/lib/maps/satellite-path.ts defaults).

ALTER TABLE bids ADD COLUMN IF NOT EXISTS satellite_image_url text;

UPDATE bids
SET
  satellite_image_url = '/api/maps/satellite?lat=' || latitude::text || '&lng=' || longitude::text || '&w=600&h=360&zoom=18'
WHERE
  latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND satellite_image_url IS NULL;
