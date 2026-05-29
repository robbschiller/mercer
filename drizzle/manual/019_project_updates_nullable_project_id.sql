-- 019_project_updates_nullable_project_id.sql
-- Phase 3, Stage 2 enabler: the project feed is now keyed by bid_id (the bid
-- row is the project). New updates carry only bid_id, so project_id must be
-- nullable. The column itself is dropped with the projects table in Stage 3
-- (020). Safe/additive. See docs/build-plans/property_rooted_remodel.plan.md.

ALTER TABLE project_updates ALTER COLUMN project_id DROP NOT NULL;
