-- 020_drop_projects.sql
-- Phase 3, Stage 3 (destructive) of the property-rooted re-model: the bid row
-- is now the project (delivery fields live on bids; project_updates is keyed by
-- bid_id). The legacy delivery `projects` table and project_updates.project_id
-- are no longer read or written by any code path — drop them.
-- Irreversible. See docs/build-plans/property_rooted_remodel.plan.md.

-- Drop the inbound FK column first, then the table it referenced.
ALTER TABLE project_updates DROP COLUMN IF EXISTS project_id;
DROP TABLE IF EXISTS projects;

-- bid_id is now the sole parent of an update; lock it down.
ALTER TABLE project_updates ALTER COLUMN bid_id SET NOT NULL;
