-- 017_rate_config.sql
-- Phase 2 of the property-rooted re-model: org-level rate config the
-- deterministic pricing engine reads, so rates are stored config and never
-- model-invented (the receiving end of the prompt-bidding boundary). Scalar
-- paint rates mirror user_defaults; access_rates holds per-archetype access
-- pricing. Backfilled from user_defaults; user_defaults stays readable during
-- the transition. See docs/build-plans/property_rooted_remodel.plan.md.

CREATE TABLE IF NOT EXISTS rate_config (
  user_id uuid PRIMARY KEY,
  coverage_sqft_per_gallon numeric,
  price_per_gallon numeric,
  labor_rate_per_unit numeric,
  margin_percent numeric,
  access_rates jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO rate_config (
  user_id, coverage_sqft_per_gallon, price_per_gallon,
  labor_rate_per_unit, margin_percent, updated_at
)
SELECT user_id, coverage_sqft_per_gallon, price_per_gallon,
       labor_rate_per_unit, margin_percent, updated_at
FROM user_defaults
ON CONFLICT (user_id) DO NOTHING;
