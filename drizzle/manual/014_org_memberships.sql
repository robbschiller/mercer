-- 014_org_memberships.sql
-- Multi-user organizations: each existing user is implicitly the owner of
-- their own org (de-facto org id = owner_user_id). Additional members are
-- stored here with role/status. Pending invites have user_id = null until
-- the invitee signs up with the matching email.
--
-- Tenant scoping in the rest of the schema continues to use the existing
-- user_id columns; those are now interpreted as "owner_user_id" (the org
-- owner's auth.users id), and queries route through requireUser().ownerUserId.

CREATE TABLE IF NOT EXISTS org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  user_id uuid,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  invited_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One active membership per user.
CREATE UNIQUE INDEX IF NOT EXISTS org_memberships_user_active_idx
  ON org_memberships (user_id)
  WHERE user_id IS NOT NULL AND status = 'active';

-- One pending invite per (org, email) — case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS org_memberships_owner_email_pending_idx
  ON org_memberships (owner_user_id, lower(email))
  WHERE status = 'invited';

CREATE INDEX IF NOT EXISTS org_memberships_owner_idx
  ON org_memberships (owner_user_id);

CREATE INDEX IF NOT EXISTS org_memberships_email_pending_lookup_idx
  ON org_memberships (lower(email))
  WHERE status = 'invited' AND user_id IS NULL;
