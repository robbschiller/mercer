-- 024_lead_fields_rep.sql
-- AQP reconciliation, Phase 2a (additive lead fields + rep inheritance).
--   leads.is_large_job  — the large/small takeoff + billing fork (2-week rule)
--   leads.scope_category — scope tags array
--   leads.est_value      — pre-takeoff $ estimate (pipeline value/forecast)
--   accounts.internal_rep_id — the rep who owns the mgmt-company relationship,
--                              inherited onto new leads as owner_id
-- (Full lead-status-enum expansion is deliberately deferred — it ripples
-- through the won/lost acceptance flow and deserves its own pass.)
-- See docs/build-plans/aqp_reconciliation.plan.md.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_large_job boolean NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scope_category text[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS est_value numeric;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS internal_rep_id uuid;
