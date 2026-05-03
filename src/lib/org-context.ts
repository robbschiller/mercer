import { cache } from "react";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { orgMemberships } from "@/db/schema";
import { getSessionUser } from "@/lib/supabase/auth-cache";

export type OrgRole = "owner" | "admin" | "member";

export type OrgContext = {
  /** Auth user id (the actor — used for actor_user_id audit fields). */
  userId: string;
  /** Tenant scope — the org owner's user id. For solo accounts equals userId. */
  ownerUserId: string;
  email: string | null;
  name: string | null;
  role: OrgRole;
};

/**
 * Resolves the org membership for the current session user. Cached per
 * RSC request via React's `cache()` so layout + page + store calls share
 * one DB lookup.
 *
 * Resolution order:
 *   1. Active membership row keyed by `userId` → returns the linked org.
 *   2. Pending invite by email → accept it (set userId + active) and
 *      return the now-linked org.
 *   3. No row → user is solo owner of their own org (ownerUserId = userId,
 *      role = 'owner'). No row is written for solo owners.
 */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const activeRows = await db
    .select({
      ownerUserId: orgMemberships.ownerUserId,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, user.id),
        eq(orgMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (activeRows[0]) {
    return {
      userId: user.id,
      ownerUserId: activeRows[0].ownerUserId,
      email: user.email,
      name: user.name,
      role: normalizeRole(activeRows[0].role),
    };
  }

  if (user.email) {
    const accepted = await acceptPendingInvite(user.id, user.email);
    if (accepted) {
      return {
        userId: user.id,
        ownerUserId: accepted.ownerUserId,
        email: user.email,
        name: user.name,
        role: normalizeRole(accepted.role),
      };
    }
  }

  return {
    userId: user.id,
    ownerUserId: user.id,
    email: user.email,
    name: user.name,
    role: "owner",
  };
});

async function acceptPendingInvite(userId: string, email: string) {
  const updated = await db
    .update(orgMemberships)
    .set({
      userId,
      status: "active",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orgMemberships.status, "invited"),
        isNull(orgMemberships.userId),
        sql`lower(${orgMemberships.email}) = lower(${email})`,
      ),
    )
    .returning({
      ownerUserId: orgMemberships.ownerUserId,
      role: orgMemberships.role,
    });
  return updated[0] ?? null;
}

function normalizeRole(value: string): OrgRole {
  return value === "owner" || value === "admin" ? value : "member";
}

export async function requireOrgContext(): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("Not authenticated");
  return ctx;
}
