-- 012_company_profiles.sql
-- Phase G, slice 1: onboarding wizard scaffolding + branded bid surfaces.
-- Two additive tables, both keyed by user_id (1:1 with auth.users).
--   company_profiles : brand data that themes the bid (PDF + /p/[slug])
--   onboardings      : per-step timestamps for the welcome wizard
-- Single-tenant per user today; mirrors the user_defaults pattern.
-- See docs/plan.md → "Phase G — Onboarding wizard + branded bid surfaces".

CREATE TABLE IF NOT EXISTS company_profiles (
  user_id uuid PRIMARY KEY,
  website_url text,
  company_name text,
  tagline text,
  street text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  logo_url text,
  primary_color text,
  accent_color text,
  body_font text,
  enrichment_status text,
  enrichment_error text,
  enrichment_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboardings (
  user_id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  website_submitted_at timestamptz,
  profile_confirmed_at timestamptz,
  theme_confirmed_at timestamptz,
  completed_at timestamptz,
  skipped boolean NOT NULL DEFAULT false
);
