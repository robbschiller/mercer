-- 043_proposal_brain.sql
-- Proposal composer Phase 1 (docs/build-plans/proposal_composer.plan.md):
-- (1) org_knowledge_files — the claude.ai "project knowledge" equivalent:
--     raw files (messaging guide, pricing spreadsheet, example takeoff,
--     sample proposal, supplier sheets) uploaded once, fed to generation
--     as-is. Jordan never does data entry.
-- (2) bid_budgets — the internal face of a proposal: the takeoff budget
--     (materials with spread-rate bases, labor, admin/commission build-up)
--     the margin guardrail reads. One live row per bid; stamping copies it
--     into the proposal snapshot.
-- NOTE: apply individually (bulk db:apply-manual is broken — see 021 note).

CREATE TABLE IF NOT EXISTS org_knowledge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN (
    'pricing', 'supplier_pricing', 'takeoff_template', 'sample_proposal',
    'messaging', 'testimonials', 'company_facts', 'other'
  )),
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  storage_path text NOT NULL,
  url text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_knowledge_files_user_idx
  ON org_knowledge_files (user_id, kind);

CREATE TABLE IF NOT EXISTS bid_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL UNIQUE REFERENCES bids(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- Budget lines + build-up math as one document (categories vary per org;
  -- the TS layer owns the shape — see BidBudgetData in src/lib/budget.ts).
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
