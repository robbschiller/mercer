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
} from "@/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";
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
export type BuildingWithSqft = Building & { totalSqft: number };

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

  const bidId = sql.raw('"bids"."id"');

  const rows = await db
    .select({
      bid: bids,
      buildingCount: sql<number>`coalesce((
        select count(*) from buildings where buildings.bid_id = ${bidId}
      ), 0)`,
      totalSqft: sql<number>`coalesce((
        select sum(s.total_sqft::numeric * b.count)
        from surfaces s
        join buildings b on b.id = s.building_id
        where b.bid_id = ${bidId}
      ), 0)`,
      lastProposalAt: sql<string | null>`(
        select max(p.created_at)::text
        from proposals p
        where p.bid_id = ${bidId}
      )`,
    })
    .from(bids)
    .where(eq(bids.userId, user.id))
    .orderBy(desc(bids.updatedAt));

  return rows.map((r) => ({
    ...r.bid,
    buildingCount: Number(r.buildingCount),
    totalSqft: Number(r.totalSqft),
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

  const [
    bidRows,
    buildingRows,
    surfaceRows,
    lineItemRows,
    sqftRows,
    proposalRows,
    proposalShareRows,
  ] =
    await Promise.all([
      db
        .select()
        .from(bids)
        .where(and(eq(bids.id, bidId), eq(bids.userId, user.id)))
        .limit(1),
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

  const bid = bidRows[0] ?? null;
  if (!bid) return null;

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
    .select({ id: proposals.id })
    .from(proposals)
    .innerJoin(bids, eq(proposals.bidId, bids.id))
    .where(and(eq(proposals.id, proposalId), eq(bids.userId, user.id)))
    .limit(1);
  if (!proposalRows[0]) throw new Error("Proposal not found");

  const rows = await db
    .insert(proposalShares)
    .values({ proposalId })
    .returning();
  return rows[0];
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

export async function acceptProposalShare(
  slug: string,
  data: { acceptedByName: string; acceptedByTitle: string | null }
) {
  const shareRows = await db
    .select({ share: proposalShares, proposal: proposals })
    .from(proposalShares)
    .innerJoin(proposals, eq(proposalShares.proposalId, proposals.id))
    .where(eq(proposalShares.id, slug))
    .limit(1);
  const existing = shareRows[0];
  if (!existing) throw new Error("Proposal share not found");
  if (existing.share.acceptedAt || existing.share.declinedAt) {
    throw new Error("This proposal has already been responded to.");
  }

  const [updatedShare] = await db
    .update(proposalShares)
    .set({
      acceptedAt: new Date(),
      acceptedByName: data.acceptedByName,
      acceptedByTitle: data.acceptedByTitle,
    })
    .where(eq(proposalShares.id, slug))
    .returning();

  await db
    .update(bids)
    .set({ status: "won", updatedAt: new Date() })
    .where(eq(bids.id, existing.proposal.bidId));

  const [bidRow] = await db
    .select({ leadId: bids.leadId })
    .from(bids)
    .where(eq(bids.id, existing.proposal.bidId))
    .limit(1);
  if (bidRow?.leadId) {
    await db
      .update(leads)
      .set({ status: "won", updatedAt: new Date() })
      .where(eq(leads.id, bidRow.leadId));
  }

  return updatedShare;
}

export async function declineProposalShare(
  slug: string,
  data: { reason: string | null }
) {
  const shareRows = await db
    .select({ share: proposalShares, proposal: proposals })
    .from(proposalShares)
    .innerJoin(proposals, eq(proposalShares.proposalId, proposals.id))
    .where(eq(proposalShares.id, slug))
    .limit(1);
  const existing = shareRows[0];
  if (!existing) throw new Error("Proposal share not found");
  if (existing.share.acceptedAt || existing.share.declinedAt) {
    throw new Error("This proposal has already been responded to.");
  }

  const [updatedShare] = await db
    .update(proposalShares)
    .set({
      declinedAt: new Date(),
      declineReason: data.reason,
    })
    .where(eq(proposalShares.id, slug))
    .returning();

  await db
    .update(bids)
    .set({ status: "lost", updatedAt: new Date() })
    .where(eq(bids.id, existing.proposal.bidId));

  const [bidRow] = await db
    .select({ leadId: bids.leadId })
    .from(bids)
    .where(eq(bids.id, existing.proposal.bidId))
    .limit(1);
  if (bidRow?.leadId) {
    await db
      .update(leads)
      .set({ status: "lost", updatedAt: new Date() })
      .where(eq(leads.id, bidRow.leadId));
  }

  return updatedShare;
}

// ── Leads ──

export async function getLeads() {
  const user = await requireUser();
  return db
    .select()
    .from(leads)
    .where(eq(leads.userId, user.id))
    .orderBy(desc(leads.createdAt));
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

/**
 * Manual override of a lead's resolved property. Used when Places picked the
 * wrong building (zip-level match, mis-resolved on company name, etc.). Sets
 * enrichment_status = 'success' and rebuilds the satellite_image_url proxy
 * path to match the new coords.
 */
export async function overrideLeadProperty(
  id: string,
  data: {
    resolvedAddress: string;
    latitude: number | null;
    longitude: number | null;
    googlePlaceId: string | null;
  }
): Promise<Lead | null> {
  const user = await requireUser();
  const rows = await db
    .update(leads)
    .set({
      resolvedAddress: data.resolvedAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      googlePlaceId: data.googlePlaceId,
      satelliteImageUrl: buildSatelliteProxyPath(data.latitude, data.longitude),
      enrichmentStatus: "success",
      enrichmentError: null,
      updatedAt: new Date(),
    })
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
