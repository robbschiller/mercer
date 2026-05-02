import { db } from "@/db";
import {
  bids,
  buildings,
  surfaces,
  lineItems,
  userDefaults,
  proposals,
  proposalShares,
  leads,
  projects,
  projectUpdates,
  companyProfiles,
  onboardings,
} from "@/db/schema";
import {
  eq,
  desc,
  and,
  asc,
  sql,
  ilike,
  or,
  inArray,
  isNull,
  type SQL,
} from "drizzle-orm";
import { getSessionUser } from "@/lib/supabase/auth-cache";
import { computeTotalSqft } from "@/lib/dimensions";
import { buildSatelliteProxyPath } from "@/lib/maps/satellite-path";

export type Bid = typeof bids.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Surface = typeof surfaces.$inferSelect;
export type LineItem = typeof lineItems.$inferSelect;
export type UserDefault = typeof userDefaults.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type ProposalShare = typeof proposalShares.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type Onboarding = typeof onboardings.$inferSelect;
export type BuildingWithSqft = Building & { totalSqft: number };

const NO_PROPERTY_ADDRESS_KEY = "__no_address__";

async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function requireBidOwnership(bidId: string, existingUserId?: string) {
  const userId = existingUserId ?? (await requireUser()).id;
  const rows = await db
    .select({ id: bids.id })
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new Error("Bid not found");
  return userId;
}

async function requireBuildingOwnership(buildingId: string, existingUserId?: string) {
  const userId = existingUserId ?? (await requireUser()).id;
  const rows = await db
    .select({ id: buildings.id, bidId: buildings.bidId })
    .from(buildings)
    .innerJoin(bids, eq(buildings.bidId, bids.id))
    .where(and(eq(buildings.id, buildingId), eq(bids.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new Error("Building not found");
  return { userId, bidId: rows[0].bidId };
}

// ── Bids ──

export async function getBids() {
  const user = await requireUser();
  return db
    .select()
    .from(bids)
    .where(eq(bids.userId, user.id))
    .orderBy(desc(bids.updatedAt));
}

export async function getBidsWithSummary() {
  const user = await requireUser();

  // Aggregates pre-computed once per bid via grouped subqueries (instead of
  // three correlated subqueries per bid row). Each subquery is scoped to the
  // current user via INNER JOIN on bids so multi-tenant scans stay bounded
  // and the planner can use bids(user_id, ...) + the FK indexes added in
  // 007_perf_indexes.sql.
  const buildingAgg = db
    .select({
      bidId: buildings.bidId,
      buildingCount: sql<number>`count(distinct ${buildings.id})::int`.as(
        "building_count"
      ),
      totalSqft: sql<string>`coalesce(sum(${surfaces.totalSqft}::numeric * ${buildings.count}), 0)`.as(
        "total_sqft"
      ),
    })
    .from(buildings)
    .innerJoin(bids, eq(buildings.bidId, bids.id))
    .leftJoin(surfaces, eq(surfaces.buildingId, buildings.id))
    .where(eq(bids.userId, user.id))
    .groupBy(buildings.bidId)
    .as("building_agg");

  const proposalAgg = db
    .select({
      bidId: proposals.bidId,
      lastProposalAt: sql<string>`max(${proposals.createdAt})::text`.as(
        "last_proposal_at"
      ),
    })
    .from(proposals)
    .innerJoin(bids, eq(proposals.bidId, bids.id))
    .where(eq(bids.userId, user.id))
    .groupBy(proposals.bidId)
    .as("proposal_agg");

  const rows = await db
    .select({
      bid: bids,
      buildingCount: buildingAgg.buildingCount,
      totalSqft: buildingAgg.totalSqft,
      lastProposalAt: proposalAgg.lastProposalAt,
    })
    .from(bids)
    .leftJoin(buildingAgg, eq(buildingAgg.bidId, bids.id))
    .leftJoin(proposalAgg, eq(proposalAgg.bidId, bids.id))
    .where(eq(bids.userId, user.id))
    .orderBy(desc(bids.updatedAt));

  return rows.map((r) => ({
    ...r.bid,
    buildingCount: Number(r.buildingCount ?? 0),
    totalSqft: Number(r.totalSqft ?? 0),
    lastProposalAt: r.lastProposalAt ? new Date(r.lastProposalAt) : null,
  }));
}

export async function getBid(id: string) {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(bids)
    .where(and(eq(bids.id, id), eq(bids.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createBid(
  data: Pick<Bid, "propertyName" | "address" | "clientName" | "notes"> &
    Partial<Pick<Bid, "latitude" | "longitude" | "googlePlaceId" | "leadId">>
) {
  const user = await requireUser();
  const lat = data.latitude ?? null;
  const lng = data.longitude ?? null;
  const leadId: string | null = data.leadId ?? null;
  if (leadId) {
    const leadRows = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, user.id)))
      .limit(1);
    if (!leadRows[0]) {
      throw new Error("Lead not found");
    }
  }
  const rows = await db
    .insert(bids)
    .values({
      propertyName: data.propertyName,
      address: data.address,
      clientName: data.clientName,
      notes: data.notes,
      latitude: lat,
      longitude: lng,
      googlePlaceId: data.googlePlaceId ?? null,
      leadId,
      satelliteImageUrl: buildSatelliteProxyPath(lat, lng),
      userId: user.id,
    })
    .returning();
  return rows[0];
}

export async function updateBid(
  id: string,
  data: Partial<
    Pick<
      Bid,
      | "propertyName"
      | "address"
      | "clientName"
      | "notes"
      | "status"
      | "latitude"
      | "longitude"
      | "googlePlaceId"
    >
  >
) {
  const user = await requireUser();
  const patch: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.latitude !== undefined || data.longitude !== undefined) {
    patch.satelliteImageUrl = buildSatelliteProxyPath(
      data.latitude ?? null,
      data.longitude ?? null
    );
  }
  const rows = await db
    .update(bids)
    .set(patch as typeof data & { updatedAt: Date; satelliteImageUrl?: string | null })
    .where(and(eq(bids.id, id), eq(bids.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteBid(id: string) {
  const user = await requireUser();
  await db
    .delete(bids)
    .where(and(eq(bids.id, id), eq(bids.userId, user.id)));
  return true;
}

// ── Buildings ──

export async function getBuildingsForBid(bidId: string) {
  await requireBidOwnership(bidId);

  const rows = await db
    .select({
      building: buildings,
      totalSqft: sql<number>`coalesce(sum(${surfaces.totalSqft}::numeric), 0)`.as(
        "total_sqft"
      ),
    })
    .from(buildings)
    .leftJoin(surfaces, eq(surfaces.buildingId, buildings.id))
    .where(eq(buildings.bidId, bidId))
    .groupBy(buildings.id)
    .orderBy(asc(buildings.sortOrder), asc(buildings.createdAt));

  return rows.map((r) => ({
    ...r.building,
    totalSqft: Number(r.totalSqft),
  }));
}

export async function getBidPageData(bidId: string) {
  const user = await requireUser();

  const bidRows = await db
    .select()
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.userId, user.id)))
    .limit(1);

  const bid = bidRows[0] ?? null;
  if (!bid) return null;

  const [
    buildingRows,
    surfaceRows,
    lineItemRows,
    sqftRows,
    proposalRows,
    proposalShareRows,
  ] =
    await Promise.all([
      db
        .select({
          building: buildings,
          totalSqft: sql<number>`coalesce(sum(${surfaces.totalSqft}::numeric), 0)`.as(
            "total_sqft"
          ),
        })
        .from(buildings)
        .leftJoin(surfaces, eq(surfaces.buildingId, buildings.id))
        .where(eq(buildings.bidId, bidId))
        .groupBy(buildings.id)
        .orderBy(asc(buildings.sortOrder), asc(buildings.createdAt)),
      db
        .select()
        .from(surfaces)
        .innerJoin(buildings, eq(surfaces.buildingId, buildings.id))
        .where(eq(buildings.bidId, bidId))
        .orderBy(asc(surfaces.sortOrder), asc(surfaces.createdAt)),
      db
        .select()
        .from(lineItems)
        .where(eq(lineItems.bidId, bidId))
        .orderBy(asc(lineItems.sortOrder), asc(lineItems.createdAt)),
      db
        .select({
          total: sql<number>`coalesce(sum(${surfaces.totalSqft}::numeric * ${buildings.count}), 0)`,
        })
        .from(surfaces)
        .innerJoin(buildings, eq(surfaces.buildingId, buildings.id))
        .where(eq(buildings.bidId, bidId)),
      db
        .select()
        .from(proposals)
        .where(eq(proposals.bidId, bidId))
        .orderBy(desc(proposals.createdAt)),
      db
        .select({ share: proposalShares, proposalId: proposals.id })
        .from(proposalShares)
        .innerJoin(proposals, eq(proposalShares.proposalId, proposals.id))
        .where(eq(proposals.bidId, bidId))
        .orderBy(desc(proposalShares.createdAt)),
    ]);

  const buildingsWithSqft = buildingRows.map((r) => ({
    ...r.building,
    totalSqft: Number(r.totalSqft),
  }));

  const surfacesByBuilding: Record<string, Surface[]> = {};
  for (const row of surfaceRows) {
    const s = row.surfaces;
    if (!surfacesByBuilding[s.buildingId]) {
      surfacesByBuilding[s.buildingId] = [];
    }
    surfacesByBuilding[s.buildingId].push(s);
  }

  return {
    bid,
    buildings: buildingsWithSqft,
    surfacesByBuilding,
    lineItems: lineItemRows,
    totalSqft: Number(sqftRows[0]?.total ?? 0),
    proposals: proposalRows,
    proposalShares: proposalShareRows,
  };
}

export async function createBuilding(
  bidId: string,
  data: { label: string; count: number }
) {
  await requireBidOwnership(bidId);

  const maxOrder = await db
    .select({ max: sql<number>`coalesce(max(${buildings.sortOrder}), -1)` })
    .from(buildings)
    .where(eq(buildings.bidId, bidId));

  const rows = await db
    .insert(buildings)
    .values({
      bidId,
      label: data.label,
      count: data.count,
      sortOrder: (maxOrder[0]?.max ?? -1) + 1,
    })
    .returning();

  return rows[0];
}

export async function updateBuilding(
  id: string,
  data: Partial<Pick<Building, "label" | "count">>
) {
  const { bidId } = await requireBuildingOwnership(id);
  const rows = await db
    .update(buildings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(buildings.id, id))
    .returning();

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  return rows[0] ?? null;
}

export async function deleteBuilding(id: string) {
  const { bidId } = await requireBuildingOwnership(id);
  await db.delete(buildings).where(eq(buildings.id, id));

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  return true;
}

// ── Surfaces ──

export async function getSurfacesForBuilding(buildingId: string) {
  await requireBuildingOwnership(buildingId);
  return db
    .select()
    .from(surfaces)
    .where(eq(surfaces.buildingId, buildingId))
    .orderBy(asc(surfaces.sortOrder), asc(surfaces.createdAt));
}

export async function createSurface(
  buildingId: string,
  data: { name: string; dimensions: number[][] }
) {
  const { bidId } = await requireBuildingOwnership(buildingId);

  const maxOrder = await db
    .select({ max: sql<number>`coalesce(max(${surfaces.sortOrder}), -1)` })
    .from(surfaces)
    .where(eq(surfaces.buildingId, buildingId));

  const totalSqft = computeTotalSqft(data.dimensions);

  const rows = await db
    .insert(surfaces)
    .values({
      buildingId,
      name: data.name,
      dimensions: data.dimensions,
      totalSqft: String(totalSqft),
      sortOrder: (maxOrder[0]?.max ?? -1) + 1,
    })
    .returning();

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  return rows[0];
}

export async function updateSurface(
  id: string,
  data: { name?: string; dimensions?: number[][] }
) {
  const user = await requireUser();
  const rows = await db
    .select({
      surface: surfaces,
      bidId: buildings.bidId,
    })
    .from(surfaces)
    .innerJoin(buildings, eq(surfaces.buildingId, buildings.id))
    .innerJoin(bids, eq(buildings.bidId, bids.id))
    .where(and(eq(surfaces.id, id), eq(bids.userId, user.id)))
    .limit(1);

  if (!rows[0]) throw new Error("Surface not found");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.dimensions !== undefined) {
    updateData.dimensions = data.dimensions;
    updateData.totalSqft = String(computeTotalSqft(data.dimensions));
  }

  const updated = await db
    .update(surfaces)
    .set(updateData)
    .where(eq(surfaces.id, id))
    .returning();

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, rows[0].bidId));

  return updated[0] ?? null;
}

export async function deleteSurface(id: string) {
  const user = await requireUser();
  const rows = await db
    .select({ bidId: buildings.bidId })
    .from(surfaces)
    .innerJoin(buildings, eq(surfaces.buildingId, buildings.id))
    .innerJoin(bids, eq(buildings.bidId, bids.id))
    .where(and(eq(surfaces.id, id), eq(bids.userId, user.id)))
    .limit(1);

  if (!rows[0]) throw new Error("Surface not found");

  await db.delete(surfaces).where(eq(surfaces.id, id));

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, rows[0].bidId));

  return true;
}

// ── Bid Pricing ──

export async function updateBidPricing(
  id: string,
  data: Partial<
    Pick<
      Bid,
      | "coverageSqftPerGallon"
      | "pricePerGallon"
      | "laborRatePerUnit"
      | "marginPercent"
    >
  >
) {
  const user = await requireUser();
  const rows = await db
    .update(bids)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(bids.id, id), eq(bids.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

// ── Line Items ──

export async function getLineItemsForBid(bidId: string) {
  await requireBidOwnership(bidId);
  return db
    .select()
    .from(lineItems)
    .where(eq(lineItems.bidId, bidId))
    .orderBy(asc(lineItems.sortOrder), asc(lineItems.createdAt));
}

export async function createLineItem(
  bidId: string,
  data: { name: string; amount: string }
) {
  await requireBidOwnership(bidId);

  const maxOrder = await db
    .select({ max: sql<number>`coalesce(max(${lineItems.sortOrder}), -1)` })
    .from(lineItems)
    .where(eq(lineItems.bidId, bidId));

  const rows = await db
    .insert(lineItems)
    .values({
      bidId,
      name: data.name,
      amount: data.amount,
      sortOrder: (maxOrder[0]?.max ?? -1) + 1,
    })
    .returning();

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  return rows[0];
}

export async function updateLineItem(
  id: string,
  data: { name?: string; amount?: string }
) {
  const user = await requireUser();
  const existing = await db
    .select({ bidId: lineItems.bidId })
    .from(lineItems)
    .innerJoin(bids, eq(lineItems.bidId, bids.id))
    .where(and(eq(lineItems.id, id), eq(bids.userId, user.id)))
    .limit(1);

  if (!existing[0]) throw new Error("Line item not found");

  const rows = await db
    .update(lineItems)
    .set(data)
    .where(eq(lineItems.id, id))
    .returning();

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, existing[0].bidId));

  return rows[0] ?? null;
}

export async function deleteLineItem(id: string) {
  const user = await requireUser();
  const existing = await db
    .select({ bidId: lineItems.bidId })
    .from(lineItems)
    .innerJoin(bids, eq(lineItems.bidId, bids.id))
    .where(and(eq(lineItems.id, id), eq(bids.userId, user.id)))
    .limit(1);

  if (!existing[0]) throw new Error("Line item not found");

  await db.delete(lineItems).where(eq(lineItems.id, id));

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, existing[0].bidId));

  return true;
}

// ── User Defaults ──

export async function getUserDefaults() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(userDefaults)
    .where(eq(userDefaults.userId, user.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertUserDefaults(
  data: Partial<
    Pick<
      UserDefault,
      | "coverageSqftPerGallon"
      | "pricePerGallon"
      | "laborRatePerUnit"
      | "marginPercent"
    >
  >
) {
  const user = await requireUser();

  const rows = await db
    .insert(userDefaults)
    .values({ userId: user.id, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userDefaults.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();

  return rows[0];
}

// ── Proposals ──

export async function getProposalsForBid(bidId: string) {
  await requireBidOwnership(bidId);
  return db
    .select()
    .from(proposals)
    .where(eq(proposals.bidId, bidId))
    .orderBy(desc(proposals.createdAt));
}

export async function createProposal(
  bidId: string,
  snapshot: unknown,
  pdfUrl: string
) {
  await requireBidOwnership(bidId);
  const rows = await db
    .insert(proposals)
    .values({ bidId, snapshot, pdfUrl })
    .returning();
  return rows[0];
}

export async function createProposalShare(proposalId: string) {
  const user = await requireUser();
  const proposalRows = await db
    .select({ id: proposals.id, bidId: proposals.bidId })
    .from(proposals)
    .innerJoin(bids, eq(proposals.bidId, bids.id))
    .where(and(eq(proposals.id, proposalId), eq(bids.userId, user.id)))
    .limit(1);
  const proposalRow = proposalRows[0];
  if (!proposalRow) throw new Error("Proposal not found");

  const rows = await db
    .insert(proposalShares)
    .values({ proposalId })
    .returning();
  return { ...rows[0], bidId: proposalRow.bidId };
}

export async function getProposalShareBySlug(slug: string) {
  const rows = await db
    .select({
      share: proposalShares,
      proposal: proposals,
      bid: bids,
    })
    .from(proposalShares)
    .innerJoin(proposals, eq(proposalShares.proposalId, proposals.id))
    .innerJoin(bids, eq(proposals.bidId, bids.id))
    .where(eq(proposalShares.id, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function markProposalShareAccessed(slug: string) {
  const rows = await db
    .update(proposalShares)
    .set({ accessedAt: new Date() })
    .where(and(eq(proposalShares.id, slug), sql`${proposalShares.accessedAt} is null`))
    .returning();
  return rows[0] ?? null;
}

async function respondToProposalShare(
  slug: string,
  outcome: "won" | "lost",
  patch: Partial<typeof proposalShares.$inferInsert>
) {
  return db.transaction(async (tx) => {
    const shareRows = await tx
      .select({
        share: proposalShares,
        bidId: proposals.bidId,
        bidUserId: bids.userId,
        leadId: bids.leadId,
      })
      .from(proposalShares)
      .innerJoin(proposals, eq(proposalShares.proposalId, proposals.id))
      .innerJoin(bids, eq(bids.id, proposals.bidId))
      .where(eq(proposalShares.id, slug))
      .limit(1);
    const existing = shareRows[0];
    if (!existing) throw new Error("Proposal share not found");
    if (existing.share.acceptedAt || existing.share.declinedAt) {
      throw new Error("This proposal has already been responded to.");
    }

    const now = new Date();
    const [updatedShare] = await tx
      .update(proposalShares)
      .set(patch)
      .where(eq(proposalShares.id, slug))
      .returning();

    await tx
      .update(bids)
      .set({ status: outcome, updatedAt: now })
      .where(eq(bids.id, existing.bidId));

    if (existing.leadId) {
      await tx
        .update(leads)
        .set({ status: outcome, updatedAt: now })
        .where(eq(leads.id, existing.leadId));
    }

    let projectId: string | null = null;
    if (outcome === "won") {
      // Atomic create-on-accept. UNIQUE bid_id + ON CONFLICT DO NOTHING
      // makes this idempotent under any race (e.g. share toggled and
      // re-accepted). See PRD §5.5.
      const inserted = await tx
        .insert(projects)
        .values({
          bidId: existing.bidId,
          userId: existing.bidUserId,
          acceptedByName: updatedShare.acceptedByName,
          acceptedByTitle: updatedShare.acceptedByTitle,
          acceptedAt: updatedShare.acceptedAt,
        })
        .onConflictDoNothing({ target: projects.bidId })
        .returning({ id: projects.id });
      if (inserted[0]) {
        projectId = inserted[0].id;
      } else {
        const existingProject = await tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.bidId, existing.bidId))
          .limit(1);
        projectId = existingProject[0]?.id ?? null;
      }
    }

    return {
      share: updatedShare,
      bidId: existing.bidId,
      leadId: existing.leadId ?? null,
      projectId,
    };
  });
}

export async function acceptProposalShare(
  slug: string,
  data: { acceptedByName: string; acceptedByTitle: string | null }
) {
  return respondToProposalShare(slug, "won", {
    acceptedAt: new Date(),
    acceptedByName: data.acceptedByName,
    acceptedByTitle: data.acceptedByTitle,
  });
}

export async function declineProposalShare(
  slug: string,
  data: { reason: string | null }
) {
  return respondToProposalShare(slug, "lost", {
    declinedAt: new Date(),
    declineReason: data.reason,
  });
}

export async function getProjectByBidId(
  bidId: string
): Promise<Project | null> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.bidId, bidId), eq(projects.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

export type ProjectWithBid = {
  project: Project;
  bid: Pick<
    Bid,
    | "id"
    | "propertyName"
    | "address"
    | "clientName"
    | "leadId"
    | "status"
  >;
};

export type GetProjectsOptions = {
  status?: ProjectStatus | null;
  limit?: number;
  offset?: number;
};

export async function getProjects(
  options: GetProjectsOptions = {},
): Promise<ProjectWithBid[]> {
  const user = await requireUser();
  const conditions: SQL[] = [eq(projects.userId, user.id)];
  if (options.status) conditions.push(eq(projects.status, options.status));

  const query = db
    .select({
      project: projects,
      bid: {
        id: bids.id,
        propertyName: bids.propertyName,
        address: bids.address,
        clientName: bids.clientName,
        leadId: bids.leadId,
        status: bids.status,
      },
    })
    .from(projects)
    .innerJoin(bids, eq(bids.id, projects.bidId))
    .where(and(...conditions)!)
    .orderBy(desc(projects.updatedAt), desc(projects.id));

  if (options.limit != null || options.offset != null) {
    return query
      .limit(Math.max(1, options.limit ?? 100))
      .offset(Math.max(0, options.offset ?? 0));
  }

  return query;
}

export async function getProjectListData(options: {
  status?: ProjectStatus | null;
} = {}): Promise<{ projects: ProjectWithBid[]; counts: ProjectStatusCounts }> {
  const [rows, counts] = await Promise.all([
    getProjects({ status: options.status ?? null }),
    getProjectStatusCounts(),
  ]);
  return { projects: rows, counts };
}

export async function getProject(id: string): Promise<ProjectWithBid | null> {
  const user = await requireUser();
  const rows = await db
    .select({
      project: projects,
      bid: {
        id: bids.id,
        propertyName: bids.propertyName,
        address: bids.address,
        clientName: bids.clientName,
        leadId: bids.leadId,
        status: bids.status,
      },
    })
    .from(projects)
    .innerJoin(bids, eq(bids.id, projects.bidId))
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Allowed transitions per PRD §5.5 state machine.
 *
 *     not_started → in_progress → punch_out → complete ──┐
 *                       ↓             ↑                  │
 *                    on_hold ─────────┘                  │
 *                       ↑                                │
 *                       └──────── reopen ────────────────┘
 *
 * `on_hold` is reachable from any non-terminal state and exits back to
 * `in_progress`. `complete` can be reopened to `punch_out` (typical:
 * walk-list items resurface) or back to `in_progress` (substantive
 * rework). Reopening clears `actual_end_date` so the next `complete`
 * re-stamps it; `actual_start_date` is preserved.
 */
const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  not_started: ["in_progress", "on_hold"],
  in_progress: ["punch_out", "on_hold"],
  punch_out: ["complete", "on_hold"],
  on_hold: ["in_progress"],
  complete: ["punch_out", "in_progress"],
};

export function allowedProjectStatusTransitions(
  current: ProjectStatus
): ProjectStatus[] {
  return PROJECT_STATUS_TRANSITIONS[current] ?? [];
}

export async function updateProjectStatus(
  id: string,
  next: ProjectStatus
): Promise<Project | null> {
  const user = await requireUser();
  const existing = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);
  const current = existing[0];
  if (!current) return null;

  if (current.status === next) return current;
  const allowed = allowedProjectStatusTransitions(current.status);
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid status transition: ${current.status} → ${next}`
    );
  }

  const now = new Date();
  const patch: Partial<typeof projects.$inferInsert> = {
    status: next,
    updatedAt: now,
  };
  // Auto-stamp actual_start_date the first time we enter in_progress.
  if (next === "in_progress" && !current.actualStartDate) {
    patch.actualStartDate = now;
  }
  // Auto-stamp actual_end_date the first time we enter complete.
  if (next === "complete" && !current.actualEndDate) {
    patch.actualEndDate = now;
  }
  // Reopen from complete clears actual_end_date so the next complete
  // re-stamps it; actual_start_date is preserved through the reopen.
  if (current.status === "complete" && next !== "complete") {
    patch.actualEndDate = null;
  }

  const rows = await db
    .update(projects)
    .set(patch)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

export async function updateProjectDetails(
  id: string,
  data: {
    targetStartDate: string | null;
    targetEndDate: string | null;
    assignedSub: string | null;
    crewLeadName: string | null;
    notes: string;
  }
): Promise<Project | null> {
  const user = await requireUser();
  const rows = await db
    .update(projects)
    .set({
      targetStartDate: data.targetStartDate,
      targetEndDate: data.targetEndDate,
      assignedSub: data.assignedSub,
      crewLeadName: data.crewLeadName,
      notes: data.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

/**
 * All updates for a project, newest first. Caller is responsible for
 * having already confirmed the project belongs to the requesting user
 * (typically via getProject()).
 */
export async function getProjectUpdates(
  projectId: string
): Promise<ProjectUpdate[]> {
  return db
    .select()
    .from(projectUpdates)
    .where(eq(projectUpdates.projectId, projectId))
    .orderBy(desc(projectUpdates.createdAt));
}

export async function createProjectUpdate(
  projectId: string,
  data: { body: string; visibleOnPublicUrl: boolean }
): Promise<ProjectUpdate> {
  const user = await requireUser();
  // Ownership check: only the project owner can append updates.
  const owned = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);
  if (!owned[0]) throw new Error("Project not found");

  const authorName = user.email ?? "Unknown";
  const rows = await db
    .insert(projectUpdates)
    .values({
      projectId,
      authorType: "human",
      authorName,
      body: data.body,
      visibleOnPublicUrl: data.visibleOnPublicUrl,
    })
    .returning();
  // Touch the parent project so list-view ordering reflects activity.
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  return rows[0]!;
}

/**
 * Public-facing project view for /p/[slug] post-acceptance. No user
 * scoping — accessed via the share slug — but only returns the slim
 * fields a property manager should see, and only opted-in updates.
 */
export type PublicProjectView = {
  status: ProjectStatus;
  targetStartDate: string | null;
  targetEndDate: string | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  assignedSub: string | null;
  crewLeadName: string | null;
  acceptedByName: string | null;
  acceptedByTitle: string | null;
  acceptedAt: Date | null;
  updates: Array<
    Pick<ProjectUpdate, "id" | "body" | "authorName" | "createdAt">
  >;
};

/**
 * Slugs for every proposal share tied to a given bid. Used to fan out
 * revalidatePath() calls when project state that the public page
 * surfaces (status, public updates) changes.
 */
export async function getShareSlugsForBid(bidId: string): Promise<string[]> {
  const rows = await db
    .select({ id: proposalShares.id })
    .from(proposalShares)
    .innerJoin(proposals, eq(proposalShares.proposalId, proposals.id))
    .where(eq(proposals.bidId, bidId));
  return rows.map((r) => r.id);
}

export async function getPublicProjectByBidId(
  bidId: string
): Promise<PublicProjectView | null> {
  const projectRows = await db
    .select({
      id: projects.id,
      status: projects.status,
      targetStartDate: projects.targetStartDate,
      targetEndDate: projects.targetEndDate,
      actualStartDate: projects.actualStartDate,
      actualEndDate: projects.actualEndDate,
      assignedSub: projects.assignedSub,
      crewLeadName: projects.crewLeadName,
      acceptedByName: projects.acceptedByName,
      acceptedByTitle: projects.acceptedByTitle,
      acceptedAt: projects.acceptedAt,
    })
    .from(projects)
    .where(eq(projects.bidId, bidId))
    .limit(1);
  const project = projectRows[0];
  if (!project) return null;

  const updates = await db
    .select({
      id: projectUpdates.id,
      body: projectUpdates.body,
      authorName: projectUpdates.authorName,
      createdAt: projectUpdates.createdAt,
    })
    .from(projectUpdates)
    .where(
      and(
        eq(projectUpdates.projectId, project.id),
        eq(projectUpdates.visibleOnPublicUrl, true)
      )
    )
    .orderBy(desc(projectUpdates.createdAt));

  return {
    status: project.status,
    targetStartDate: project.targetStartDate,
    targetEndDate: project.targetEndDate,
    actualStartDate: project.actualStartDate,
    actualEndDate: project.actualEndDate,
    assignedSub: project.assignedSub,
    crewLeadName: project.crewLeadName,
    acceptedByName: project.acceptedByName,
    acceptedByTitle: project.acceptedByTitle,
    acceptedAt: project.acceptedAt,
    updates,
  };
}

// ── Status count aggregates (cheap GROUP BY for dashboard) ──

export type BidStatus = (typeof bids.$inferSelect)["status"];
export type LeadStatus = (typeof leads.$inferSelect)["status"];
export type ProjectStatus = (typeof projects.$inferSelect)["status"];

export type BidStatusCounts = {
  total: number;
  draft: number;
  sent: number;
  won: number;
  lost: number;
};

export type LeadStatusCounts = {
  total: number;
  new: number;
  quoted: number;
  won: number;
  lost: number;
};

export type ProjectStatusCounts = {
  total: number;
  not_started: number;
  in_progress: number;
  punch_out: number;
  complete: number;
  on_hold: number;
  /** Anything not in `complete` — the contractor's "still working it" set. */
  active: number;
  /** Active projects whose `target_end_date` is in the past. */
  overdue: number;
};

export async function getBidStatusCounts(): Promise<BidStatusCounts> {
  const user = await requireUser();
  const rows = await db
    .select({
      status: bids.status,
      count: sql<number>`count(*)::int`,
    })
    .from(bids)
    .where(eq(bids.userId, user.id))
    .groupBy(bids.status);

  const counts: BidStatusCounts = { total: 0, draft: 0, sent: 0, won: 0, lost: 0 };
  for (const row of rows) {
    const n = Number(row.count);
    if (row.status in counts) counts[row.status as BidStatus] = n;
    counts.total += n;
  }
  return counts;
}

export async function getProjectStatusCounts(): Promise<ProjectStatusCounts> {
  const user = await requireUser();
  // Single GROUP BY round trip — counts per status, plus a count of
  // overdue rows in the same row (active + target_end_date < today).
  const rows = await db
    .select({
      status: projects.status,
      count: sql<number>`count(*)::int`,
      overdue: sql<number>`count(*) filter (where ${projects.targetEndDate} is not null and ${projects.targetEndDate} < current_date and ${projects.status} <> 'complete')::int`,
    })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .groupBy(projects.status);

  const counts: ProjectStatusCounts = {
    total: 0,
    not_started: 0,
    in_progress: 0,
    punch_out: 0,
    complete: 0,
    on_hold: 0,
    active: 0,
    overdue: 0,
  };
  for (const row of rows) {
    const n = Number(row.count);
    if (row.status in counts) {
      counts[row.status as ProjectStatus] = n;
    }
    counts.total += n;
    if (row.status !== "complete") counts.active += n;
    counts.overdue += Number(row.overdue);
  }
  return counts;
}

export async function getLeadStatusCounts(options?: {
  sourceTag?: string | null;
}): Promise<LeadStatusCounts> {
  const user = await requireUser();
  const tag = options?.sourceTag?.trim() || null;
  const rows = await db
    .select({
      status: leads.status,
      count: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(
      tag
        ? and(eq(leads.userId, user.id), eq(leads.sourceTag, tag))
        : eq(leads.userId, user.id)
    )
    .groupBy(leads.status);

  const counts: LeadStatusCounts = { total: 0, new: 0, quoted: 0, won: 0, lost: 0 };
  for (const row of rows) {
    const n = Number(row.count);
    if (row.status in counts) counts[row.status as LeadStatus] = n;
    counts.total += n;
  }
  return counts;
}

// ── Leads ──

/** Hard ceiling on `limit` — a tampered URL can't pull the whole table. */
export const LEADS_PAGE_MAX_LIMIT = 500;
/** Default page size when the caller doesn't specify one. */
export const LEADS_PAGE_DEFAULT_LIMIT = 100;

export const LEADS_FOLLOW_UP_FILTERS = [
  "overdue",
  "today",
  "this_week",
  "none",
] as const;
export type LeadsFollowUpFilter = (typeof LEADS_FOLLOW_UP_FILTERS)[number];

export const LEADS_SORTS = [
  "recent",
  "follow_up",
  "last_contact",
  "stalest",
] as const;
export type LeadsSort = (typeof LEADS_SORTS)[number];

export type GetLeadsOptions = {
  /** Free-text search across name/company/property/email/phone/address/tag. */
  q?: string | null;
  status?: LeadStatus | null;
  sourceTag?: string | null;
  followUp?: LeadsFollowUpFilter | null;
  sort?: LeadsSort | null;
  /** Number of rows to return (clamped to `[1, LEADS_PAGE_MAX_LIMIT]`). */
  limit?: number;
  /** Rows to skip (clamped to `>= 0`). */
  offset?: number;
};

export type GetLeadsResult = {
  rows: Lead[];
  /** Total rows matching the current filter set (before limit/offset). */
  total: number;
  /** Effective pagination the query actually used, after clamping. */
  limit: number;
  offset: number;
};

export type LeadSourceOption = {
  label: string;
  value: string;
};

export type LeadPropertyGroup = {
  key: string;
  address: string | null;
  managementCompany: string | null;
  propertyName: string | null;
  contacts: Lead[];
  contactCount: number;
  earliestFollowUp: string | null;
  mostRecentContact: Date | null;
};

export type GetLeadPropertyGroupsResult = {
  groups: LeadPropertyGroup[];
  total: number;
  limit: number;
  offset: number;
};

/** Escape Postgres `ILIKE` metacharacters before wrapping in `%…%`. */
function escapeIlike(needle: string): string {
  return needle.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function leadListConditions(userId: string, options: GetLeadsOptions): SQL[] {
  const conditions: SQL[] = [eq(leads.userId, userId)];

  const status = options.status?.trim() || null;
  if (status) conditions.push(eq(leads.status, status as LeadStatus));

  const sourceTag = options.sourceTag?.trim() || null;
  if (sourceTag) conditions.push(eq(leads.sourceTag, sourceTag));

  switch (options.followUp ?? null) {
    case "overdue":
      conditions.push(sql`${leads.followUpAt} < current_date`);
      break;
    case "today":
      conditions.push(sql`${leads.followUpAt} = current_date`);
      break;
    case "this_week":
      conditions.push(
        sql`${leads.followUpAt} >= current_date and ${leads.followUpAt} <= current_date + interval '6 days'`,
      );
      break;
    case "none":
      conditions.push(isNull(leads.followUpAt));
      break;
  }

  const q = options.q?.trim() || null;
  if (q) {
    const needle = `%${escapeIlike(q)}%`;
    const searchable = or(
      ilike(leads.name, needle),
      ilike(leads.company, needle),
      ilike(leads.propertyName, needle),
      ilike(leads.email, needle),
      ilike(leads.phone, needle),
      ilike(leads.resolvedAddress, needle),
      ilike(leads.sourceTag, needle),
    );
    if (searchable) conditions.push(searchable);
  }

  return conditions;
}

function clampLeadLimit(limit: number | undefined): number {
  return Math.max(
    1,
    Math.min(limit ?? LEADS_PAGE_DEFAULT_LIMIT, LEADS_PAGE_MAX_LIMIT),
  );
}

function clampOffset(offset: number | undefined): number {
  return Math.max(0, offset ?? 0);
}

const leadPropertyGroupKey = sql<string>`coalesce(lower(nullif(btrim(${leads.resolvedAddress}), '')), '__no_address__')`;

/**
 * Lead list query with SQL-level filtering + pagination.
 *
 * The where clause is built once and reused for both the page query and the
 * count query, which run in parallel. Uses the `leads_user_id_created_at_idx`
 * composite index from `drizzle/manual/003_leads.sql` for the primary ordering
 * + user scope; the `ILIKE` OR-group runs against the already-narrowed row
 * set so a trigram index is not yet warranted at this data scale (per-user
 * lead counts in the low thousands).
 */
export async function getLeads(
  options: GetLeadsOptions = {},
): Promise<GetLeadsResult> {
  const user = await requireUser();
  const limit = clampLeadLimit(options.limit);
  const offset = clampOffset(options.offset);
  const conditions = leadListConditions(user.id, options);

  const where = and(...conditions)!;

  const orderBy = leadRowOrderBy(options.sort ?? "recent");

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(where),
  ]);

  return {
    rows,
    total: Number(totalRows[0]?.count ?? 0),
    limit,
    offset,
  };
}

export async function getLeadSourceOptions(): Promise<LeadSourceOption[]> {
  const user = await requireUser();
  const rows = await db
    .selectDistinct({
      value: leads.sourceTag,
    })
    .from(leads)
    .where(
      and(
        eq(leads.userId, user.id),
        sql`${leads.sourceTag} is not null`,
        sql`btrim(${leads.sourceTag}) <> ''`,
      ),
    )
    .orderBy(asc(leads.sourceTag));

  return rows.flatMap((row) => {
    const value = row.value?.trim();
    return value ? [{ label: value, value }] : [];
  });
}

function leadRowOrderBy(sort: LeadsSort): SQL[] {
  switch (sort) {
    case "follow_up":
      return [
        sql`${leads.followUpAt} asc nulls last`,
        sql`${leads.createdAt} desc`,
        sql`${leads.id} desc`,
      ];
    case "last_contact":
      return [
        sql`${leads.lastContactedAt} desc nulls last`,
        sql`${leads.id} desc`,
      ];
    case "stalest":
      return [
        sql`${leads.lastContactedAt} asc nulls last`,
        sql`${leads.id} desc`,
      ];
    case "recent":
    default:
      return [sql`${leads.createdAt} desc`, sql`${leads.id} desc`];
  }
}

export async function getLeadPropertyGroups(
  options: GetLeadsOptions = {},
): Promise<GetLeadPropertyGroupsResult> {
  const user = await requireUser();
  const limit = clampLeadLimit(options.limit);
  const offset = clampOffset(options.offset);
  const conditions = leadListConditions(user.id, options);
  const where = and(...conditions)!;

  const grouped = db
    .select({
      key: leadPropertyGroupKey.as("key"),
      address: sql<string | null>`min(nullif(btrim(${leads.resolvedAddress}), ''))`.as(
        "address",
      ),
      managementCompany: sql<string | null>`min(nullif(btrim(${leads.company}), ''))`.as(
        "management_company",
      ),
      propertyName: sql<string | null>`min(nullif(btrim(${leads.propertyName}), ''))`.as(
        "property_name",
      ),
      contactCount: sql<number>`count(*)::int`.as("contact_count"),
      earliestFollowUp: sql<string | null>`min(${leads.followUpAt})::text`.as(
        "earliest_follow_up",
      ),
      mostRecentContact: sql<Date | null>`max(${leads.lastContactedAt})`.as(
        "most_recent_contact",
      ),
      mostRecentCreated: sql<Date>`max(${leads.createdAt})`.as(
        "most_recent_created",
      ),
    })
    .from(leads)
    .where(where)
    .groupBy(leadPropertyGroupKey)
    .as("lead_property_groups");

  const groupOrderBy = (() => {
    switch (options.sort ?? "follow_up") {
      case "recent":
        return [
          sql`${grouped.mostRecentCreated} desc nulls last`,
          asc(grouped.address),
          asc(grouped.key),
        ];
      case "last_contact":
        return [
          sql`${grouped.mostRecentContact} desc nulls last`,
          asc(grouped.address),
          asc(grouped.key),
        ];
      case "stalest":
        return [
          sql`${grouped.mostRecentContact} asc nulls last`,
          asc(grouped.address),
          asc(grouped.key),
        ];
      case "follow_up":
      default:
        return [
          sql`${grouped.earliestFollowUp} asc nulls last`,
          asc(grouped.address),
          asc(grouped.key),
        ];
    }
  })();

  const [groups, totalRows] = await Promise.all([
    db
      .select()
      .from(grouped)
      .orderBy(...groupOrderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(grouped),
  ]);

  if (groups.length === 0) {
    return { groups: [], total: Number(totalRows[0]?.count ?? 0), limit, offset };
  }

  const groupKeys = groups.map((group) => group.key);
  const contactRows = await db
    .select()
    .from(leads)
    .where(and(where, inArray(leadPropertyGroupKey, groupKeys))!)
    .orderBy(asc(leads.resolvedAddress), asc(leads.company), asc(leads.name), desc(leads.id));

  const contactsByGroup = new Map<string, Lead[]>();
  for (const lead of contactRows) {
    const key =
      lead.resolvedAddress?.trim().toLowerCase() || NO_PROPERTY_ADDRESS_KEY;
    const list = contactsByGroup.get(key);
    if (list) {
      list.push(lead);
    } else {
      contactsByGroup.set(key, [lead]);
    }
  }

  return {
    groups: groups.map((group) => ({
      key: group.key,
      address: group.address,
      managementCompany: group.managementCompany,
      propertyName: group.propertyName,
      contacts: contactsByGroup.get(group.key) ?? [],
      contactCount: Number(group.contactCount),
      earliestFollowUp: group.earliestFollowUp,
      mostRecentContact: group.mostRecentContact,
    })),
    total: Number(totalRows[0]?.count ?? 0),
    limit,
    offset,
  };
}

export async function createLead(
  data: Pick<Lead, "name"> &
    Partial<
      Pick<
        Lead,
        | "sourceTag"
        | "email"
        | "phone"
        | "company"
        | "propertyName"
        | "notes"
      >
    >
) {
  const user = await requireUser();
  const rows = await db
    .insert(leads)
    .values({
      userId: user.id,
      name: data.name,
      sourceTag: data.sourceTag ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      propertyName: data.propertyName ?? null,
      notes: data.notes ?? "",
    })
    .returning();
  return rows[0];
}

export async function getLead(id: string) {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatestBidForLead(leadId: string) {
  const user = await requireUser();
  const rows = await db
    .select({ id: bids.id, status: bids.status, updatedAt: bids.updatedAt })
    .from(bids)
    .where(and(eq(bids.userId, user.id), eq(bids.leadId, leadId)))
    .orderBy(desc(bids.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export type LeadImportRow = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  propertyName: string | null;
  /**
   * Physical address assembled from the CSV's Address/City/State/Zip
   * columns. Authoritative per 2026-04-22 — Places lookup is a fallback
   * only when the CSV doesn't carry an address.
   */
  csvAddress: string | null;
  rawRow: Record<string, string>;
};

/**
 * Bulk-insert leads from a CSV import. All rows share the same `sourceTag`
 * and land with enrichment_status = 'pending' so the enrichment worker can
 * pick them up. Returns the inserted rows (with ids) for downstream enqueue.
 */
export async function createLeadsBatch(
  rows: LeadImportRow[],
  sourceTag: string | null
): Promise<Lead[]> {
  if (rows.length === 0) return [];
  const user = await requireUser();
  return db
    .insert(leads)
    .values(
      rows.map((r) => ({
        userId: user.id,
        sourceTag,
        name: r.name,
        email: r.email,
        phone: r.phone,
        company: r.company,
        propertyName: r.propertyName,
        resolvedAddress: r.csvAddress,
        rawRow: r.rawRow,
        enrichmentStatus: "pending" as const,
      }))
    )
    .returning();
}

export async function updateLeadEnrichment(
  id: string,
  patch: Partial<
    Pick<
      Lead,
      | "resolvedAddress"
      | "latitude"
      | "longitude"
      | "googlePlaceId"
      | "satelliteImageUrl"
      | "enrichmentStatus"
      | "enrichmentError"
    >
  >
) {
  const user = await requireUser();
  const rows = await db
    .update(leads)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

export async function updateLead(
  id: string,
  patch: Partial<
    Pick<Lead, "name" | "email" | "phone" | "company" | "propertyName" | "notes">
  >,
) {
  const user = await requireUser();
  const rows = await db
    .update(leads)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

export async function logLeadContact(id: string) {
  const user = await requireUser();
  const rows = await db
    .update(leads)
    .set({
      lastContactedAt: new Date(),
      contactAttempts: sql`${leads.contactAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

export async function setLeadFollowUp(id: string, followUpAt: string | null) {
  const user = await requireUser();
  const rows = await db
    .update(leads)
    .set({ followUpAt, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

export async function updateLeadStatus(id: string, status: Lead["status"]) {
  const user = await requireUser();
  const rows = await db
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

/** Distinct source_tag values for the current user (for filter dropdown). */
export async function getLeadSourceTags(): Promise<string[]> {
  const user = await requireUser();
  const rows = await db
    .selectDistinct({ sourceTag: leads.sourceTag })
    .from(leads)
    .where(eq(leads.userId, user.id));
  return rows
    .map((r) => r.sourceTag)
    .filter((t): t is string => !!t)
    .sort();
}

/** Dollar amounts from latest proposal snapshot per bid (`grandTotal`), optional lead source filter. */
export type DashboardPipelineFinances = {
  /** Open work: bids still in play (draft or sent). */
  openPipelineUsd: number;
  /** Closed-won bids (deal value from latest proposal). */
  wonBookedUsd: number;
};

export async function getDashboardPipelineFinances(options?: {
  sourceTag?: string | null;
}): Promise<DashboardPipelineFinances> {
  const user = await requireUser();
  const tag = options?.sourceTag?.trim() || null;
  const sourceFilter = tag ? sql`AND l.source_tag = ${tag}` : sql``;

  const parseTotal = (rows: unknown): number => {
    const list = rows as { total?: string }[];
    const raw = list[0]?.total ?? "0";
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  const [openRows, wonRows] = await Promise.all([
    db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (p.bid_id)
          (p.snapshot->>'grandTotal')::numeric AS gt
        FROM proposals p
        INNER JOIN bids b ON b.id = p.bid_id
        LEFT JOIN leads l ON l.id = b.lead_id
        WHERE b.user_id = ${user.id}
          AND b.status IN ('draft', 'sent')
          ${sourceFilter}
        ORDER BY p.bid_id, p.created_at DESC
      )
      SELECT COALESCE(SUM(gt), 0)::text AS total FROM latest WHERE gt IS NOT NULL
    `),
    db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (p.bid_id)
          (p.snapshot->>'grandTotal')::numeric AS gt
        FROM proposals p
        INNER JOIN bids b ON b.id = p.bid_id
        LEFT JOIN leads l ON l.id = b.lead_id
        WHERE b.user_id = ${user.id}
          AND b.status = 'won'
          ${sourceFilter}
        ORDER BY p.bid_id, p.created_at DESC
      )
      SELECT COALESCE(SUM(gt), 0)::text AS total FROM latest WHERE gt IS NOT NULL
    `),
  ]);

  return {
    openPipelineUsd: parseTotal(openRows),
    wonBookedUsd: parseTotal(wonRows),
  };
}

// ── Onboarding ──

export async function getOnboardingState(userId?: string) {
  const id = userId ?? (await requireUser()).id;
  const rows = await db
    .select()
    .from(onboardings)
    .where(eq(onboardings.userId, id))
    .limit(1);
  return rows[0] ?? null;
}

export function isOnboardingComplete(state: Onboarding | null): boolean {
  if (!state) return false;
  return state.skipped || state.completedAt !== null;
}

export async function markOnboardingWebsiteSubmitted(websiteUrl: string) {
  const user = await requireUser();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .insert(onboardings)
      .values({ userId: user.id, websiteSubmittedAt: now })
      .onConflictDoUpdate({
        target: onboardings.userId,
        set: { websiteSubmittedAt: now },
      });

    await tx
      .insert(companyProfiles)
      .values({
        userId: user.id,
        websiteUrl,
        enrichmentStatus: "pending",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: companyProfiles.userId,
        set: {
          websiteUrl,
          enrichmentStatus: "pending",
          enrichmentError: null,
          updatedAt: now,
        },
      });
  });
}

export async function markOnboardingProfileConfirmed() {
  const user = await requireUser();
  const now = new Date();
  await db
    .insert(onboardings)
    .values({ userId: user.id, profileConfirmedAt: now })
    .onConflictDoUpdate({
      target: onboardings.userId,
      set: { profileConfirmedAt: now },
    });
}

export async function markOnboardingComplete() {
  const user = await requireUser();
  const now = new Date();
  await db
    .insert(onboardings)
    .values({
      userId: user.id,
      themeConfirmedAt: now,
      completedAt: now,
    })
    .onConflictDoUpdate({
      target: onboardings.userId,
      set: { themeConfirmedAt: now, completedAt: now },
    });
}

export async function skipOnboarding() {
  const user = await requireUser();
  const now = new Date();
  await db
    .insert(onboardings)
    .values({ userId: user.id, skipped: true, completedAt: now })
    .onConflictDoUpdate({
      target: onboardings.userId,
      set: { skipped: true, completedAt: now },
    });
}

// ── Company Profile ──

export async function getCompanyProfile(userId?: string) {
  const id = userId ?? (await requireUser()).id;
  const rows = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.userId, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function setEnrichmentResult(
  userId: string,
  result:
    | {
        status: "success";
        data: Partial<
          Pick<
            CompanyProfile,
            | "companyName"
            | "tagline"
            | "street"
            | "city"
            | "state"
            | "zip"
            | "phone"
            | "email"
            | "logoUrl"
            | "primaryColor"
          >
        >;
        raw?: unknown;
      }
    | { status: "failed"; error: string }
) {
  const now = new Date();
  if (result.status === "success") {
    const cleaned = Object.fromEntries(
      Object.entries(result.data).filter(([, v]) => v != null && v !== "")
    );
    await db
      .update(companyProfiles)
      .set({
        ...cleaned,
        enrichmentStatus: "success",
        enrichmentError: null,
        enrichmentRaw: (result.raw ?? null) as CompanyProfile["enrichmentRaw"],
        updatedAt: now,
      })
      .where(eq(companyProfiles.userId, userId));
  } else {
    await db
      .update(companyProfiles)
      .set({
        enrichmentStatus: "failed",
        enrichmentError: result.error.slice(0, 500),
        updatedAt: now,
      })
      .where(eq(companyProfiles.userId, userId));
  }
}

export async function upsertCompanyProfile(
  data: Partial<
    Pick<
      CompanyProfile,
      | "websiteUrl"
      | "companyName"
      | "tagline"
      | "street"
      | "city"
      | "state"
      | "zip"
      | "phone"
      | "email"
      | "logoUrl"
      | "primaryColor"
      | "accentColor"
      | "bodyFont"
    >
  >
) {
  const user = await requireUser();
  const now = new Date();
  const rows = await db
    .insert(companyProfiles)
    .values({ userId: user.id, ...data, updatedAt: now })
    .onConflictDoUpdate({
      target: companyProfiles.userId,
      set: { ...data, updatedAt: now },
    })
    .returning();
  return rows[0];
}
