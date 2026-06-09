import { db } from "@/db";
import {
  bids,
  buildings,
  surfaces,
  lineItems,
  accessItems,
  userDefaults,
  rateConfig,
  proposals,
  proposalShares,
  accounts,
  properties,
  contacts,
  propertyContacts,
  propertyParties,
  leads,
  leadContacts,
  activityEvents,
  auditLog,
  projectUpdates,
  expenses,
  changeOrders,
  invoices,
  companyProfiles,
  onboardings,
  orgMemberships,
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
import { getOrgContext } from "@/lib/org-context";
import { computeTotalSqft } from "@/lib/dimensions";
import { buildSatelliteProxyPath } from "@/lib/maps/satellite-path";
import { calculateBidPricing } from "@/lib/pricing";
import type {
  AccountType,
  ExpenseCategory,
  PaymentType,
  InvoiceType,
  InvoiceStatus,
  ChangeOrderReason,
  ChangeOrderStatus,
} from "@/lib/status-meta";

export type Bid = typeof bids.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Surface = typeof surfaces.$inferSelect;
export type LineItem = typeof lineItems.$inferSelect;
export type AccessItem = typeof accessItems.$inferSelect;
export type UserDefault = typeof userDefaults.$inferSelect;
export type RateConfig = typeof rateConfig.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type ProposalShare = typeof proposalShares.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type PropertyContact = typeof propertyContacts.$inferSelect;
export type PropertyParty = typeof propertyParties.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadContact = typeof leadContacts.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type Onboarding = typeof onboardings.$inferSelect;
export type BuildingWithSqft = Building & { totalSqft: number };

const NO_PROPERTY_ADDRESS_KEY = "__no_address__";

/**
 * Auth context for store queries. `id` is the session user (the actor).
 * `ownerUserId` is the tenant scope — for solo accounts equals id; for an
 * invited member it's the org owner's user id. Existing schema columns
 * named `user_id` semantically hold ownerUserId.
 */
async function requireUser() {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("Not authenticated");
  return ctx;
}

async function requireBidOwnership(bidId: string, existingUserId?: string) {
  const userId = existingUserId ?? (await requireUser()).ownerUserId;
  const rows = await db
    .select({ id: bids.id })
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new Error("Bid not found");
  return userId;
}

async function requireBuildingOwnership(buildingId: string, existingUserId?: string) {
  const userId = existingUserId ?? (await requireUser()).ownerUserId;
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
    .where(eq(bids.userId, user.ownerUserId))
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
    .where(eq(bids.userId, user.ownerUserId))
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
    .where(eq(bids.userId, user.ownerUserId))
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
    .where(eq(bids.userId, user.ownerUserId))
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
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createBid(
  data: Pick<Bid, "propertyName" | "address" | "clientName" | "notes"> &
    Partial<
      Pick<
        Bid,
        | "latitude"
        | "longitude"
        | "googlePlaceId"
        | "leadId"
        | "propertyId"
        | "primaryContactId"
      >
    >
) {
  const user = await requireUser();
  const lat = data.latitude ?? null;
  const lng = data.longitude ?? null;
  const leadId: string | null = data.leadId ?? null;
  let leadContext: Pick<
    Lead,
    "id" | "accountId" | "propertyId" | "primaryContactId" | "sourceTag"
  > | null = null;
  if (leadId) {
    const leadRows = await db
      .select({
        id: leads.id,
        accountId: leads.accountId,
        propertyId: leads.propertyId,
        primaryContactId: leads.primaryContactId,
        sourceTag: leads.sourceTag,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, user.ownerUserId)))
      .limit(1);
    if (!leadRows[0]) {
      throw new Error("Lead not found");
    }
    leadContext = leadRows[0];
  }
  const property =
    data.propertyId
      ? await db
          .select()
          .from(properties)
          .where(and(eq(properties.id, data.propertyId), eq(properties.userId, user.ownerUserId)))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : await findOrCreateProperty({
          userId: user.ownerUserId,
          accountId: leadContext?.accountId ?? null,
          name: data.propertyName,
          address: data.address,
          latitude: lat,
          longitude: lng,
          googlePlaceId: data.googlePlaceId ?? null,
          satelliteImageUrl: buildSatelliteProxyPath(lat, lng),
          sourceTag: leadContext?.sourceTag ?? null,
        });
  const propertyId = data.propertyId ?? leadContext?.propertyId ?? property?.id ?? null;
  const primaryContactId =
    data.primaryContactId ?? leadContext?.primaryContactId ?? null;
  const rows = await db
    .insert(bids)
    .values({
      propertyId,
      primaryContactId,
      propertyName: data.propertyName,
      address: data.address,
      clientName: data.clientName,
      notes: data.notes,
      latitude: lat,
      longitude: lng,
      googlePlaceId: data.googlePlaceId ?? null,
      leadId,
      satelliteImageUrl: buildSatelliteProxyPath(lat, lng),
      userId: user.ownerUserId,
    })
    .returning();
  await createActivityEvent({
    userId: user.ownerUserId,
    leadId,
    contactId: primaryContactId,
    propertyId,
    accountId: leadContext?.accountId ?? property?.accountId ?? null,
    bidId: rows[0].id,
    type: "bid_created",
    title: "Bid created",
    body: data.notes,
  });
  await writeAuditLog({
    userId: user.ownerUserId,
    entityType: "bid",
    entityId: rows[0].id,
    action: "create",
    newValues: rows[0],
  });
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
  const previous = await getBid(id);
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
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)))
    .returning();
  const bid = rows[0] ?? null;
  if (bid?.propertyId) {
    await db
      .update(properties)
      .set({
        name: bid.propertyName,
        address: bid.address,
        latitude: bid.latitude,
        longitude: bid.longitude,
        googlePlaceId: bid.googlePlaceId,
        satelliteImageUrl: bid.satelliteImageUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(properties.id, bid.propertyId), eq(properties.userId, user.ownerUserId)));
  }
  if (bid) {
    await writeAuditLog({
      userId: user.ownerUserId,
      entityType: "bid",
      entityId: bid.id,
      action: "update",
      previousValues: previous,
      newValues: bid,
      changedFields: Object.keys(data),
    });
  }
  return rows[0] ?? null;
}

export async function deleteBid(id: string) {
  const user = await requireUser();
  await db
    .delete(bids)
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)));
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
    .where(and(eq(bids.id, bidId), eq(bids.userId, user.ownerUserId)))
    .limit(1);

  const bid = bidRows[0] ?? null;
  if (!bid) return null;

  const [
    buildingRows,
    surfaceRows,
    lineItemRows,
    accessItemRows,
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
        .select()
        .from(accessItems)
        .where(eq(accessItems.bidId, bidId))
        .orderBy(asc(accessItems.sortOrder), asc(accessItems.createdAt)),
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
    accessItems: accessItemRows,
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
  data: Partial<Pick<Building, "label" | "count" | "archetype">>
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
    .where(and(eq(surfaces.id, id), eq(bids.userId, user.ownerUserId)))
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
    .where(and(eq(surfaces.id, id), eq(bids.userId, user.ownerUserId)))
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
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)))
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
    .where(and(eq(lineItems.id, id), eq(bids.userId, user.ownerUserId)))
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
    .where(and(eq(lineItems.id, id), eq(bids.userId, user.ownerUserId)))
    .limit(1);

  if (!existing[0]) throw new Error("Line item not found");

  await db.delete(lineItems).where(eq(lineItems.id, id));

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, existing[0].bidId));

  return true;
}

// ── Access Items ──

type AccessItemInput = {
  type: AccessItem["type"];
  method?: string | null;
  quantity?: string | null;
  durationDays?: number | null;
  amount?: string;
};

export async function getAccessItemsForBid(bidId: string) {
  await requireBidOwnership(bidId);
  return db
    .select()
    .from(accessItems)
    .where(eq(accessItems.bidId, bidId))
    .orderBy(asc(accessItems.sortOrder), asc(accessItems.createdAt));
}

export async function createAccessItem(bidId: string, data: AccessItemInput) {
  await requireBidOwnership(bidId);

  const maxOrder = await db
    .select({ max: sql<number>`coalesce(max(${accessItems.sortOrder}), -1)` })
    .from(accessItems)
    .where(eq(accessItems.bidId, bidId));

  const rows = await db
    .insert(accessItems)
    .values({
      bidId,
      type: data.type,
      method: data.method ?? null,
      quantity: data.quantity ?? null,
      durationDays: data.durationDays ?? null,
      amount: data.amount ?? "0",
      sortOrder: (maxOrder[0]?.max ?? -1) + 1,
    })
    .returning();

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, bidId));

  return rows[0];
}

export async function updateAccessItem(
  id: string,
  data: Partial<AccessItemInput>,
) {
  const user = await requireUser();
  const existing = await db
    .select({ bidId: accessItems.bidId })
    .from(accessItems)
    .innerJoin(bids, eq(accessItems.bidId, bids.id))
    .where(and(eq(accessItems.id, id), eq(bids.userId, user.ownerUserId)))
    .limit(1);

  if (!existing[0]) throw new Error("Access item not found");

  const patch: Partial<typeof accessItems.$inferInsert> = {};
  if (data.type !== undefined) patch.type = data.type;
  if (data.method !== undefined) patch.method = data.method;
  if (data.quantity !== undefined) patch.quantity = data.quantity;
  if (data.durationDays !== undefined) patch.durationDays = data.durationDays;
  if (data.amount !== undefined) patch.amount = data.amount;

  const rows = await db
    .update(accessItems)
    .set(patch)
    .where(eq(accessItems.id, id))
    .returning();

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, existing[0].bidId));

  return rows[0] ?? null;
}

export async function deleteAccessItem(id: string) {
  const user = await requireUser();
  const existing = await db
    .select({ bidId: accessItems.bidId })
    .from(accessItems)
    .innerJoin(bids, eq(accessItems.bidId, bids.id))
    .where(and(eq(accessItems.id, id), eq(bids.userId, user.ownerUserId)))
    .limit(1);

  if (!existing[0]) throw new Error("Access item not found");

  await db.delete(accessItems).where(eq(accessItems.id, id));

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
    .where(eq(userDefaults.userId, user.ownerUserId))
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
    .values({ userId: user.ownerUserId, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userDefaults.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();

  return rows[0];
}

// ── Rate Config ──

/**
 * Org-level rate config the deterministic pricing engine reads. Falls back to
 * user_defaults during the transition so rates resolve even before the org
 * has its own rate_config row.
 */
export async function getRateConfig(): Promise<RateConfig | null> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(rateConfig)
    .where(eq(rateConfig.userId, user.ownerUserId))
    .limit(1);
  if (rows[0]) return rows[0];

  const defaults = await db
    .select()
    .from(userDefaults)
    .where(eq(userDefaults.userId, user.ownerUserId))
    .limit(1);
  if (!defaults[0]) return null;
  return {
    userId: defaults[0].userId,
    coverageSqftPerGallon: defaults[0].coverageSqftPerGallon,
    pricePerGallon: defaults[0].pricePerGallon,
    laborRatePerUnit: defaults[0].laborRatePerUnit,
    marginPercent: defaults[0].marginPercent,
    accessRates: null,
    updatedAt: defaults[0].updatedAt,
  };
}

export async function upsertRateConfig(
  data: Partial<
    Pick<
      RateConfig,
      | "coverageSqftPerGallon"
      | "pricePerGallon"
      | "laborRatePerUnit"
      | "marginPercent"
      | "accessRates"
    >
  >,
) {
  const user = await requireUser();
  const rows = await db
    .insert(rateConfig)
    .values({ userId: user.ownerUserId, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: rateConfig.userId,
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
    .where(and(eq(proposals.id, proposalId), eq(bids.userId, user.ownerUserId)))
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

/** Pull the grand total out of a proposal snapshot (jsonb), as a numeric
 * string for the `bids.contract_value` column. Tolerant of snapshot shape. */
function snapshotTotal(snapshot: unknown): string | null {
  const s = snapshot as
    | { pricing?: { grandTotal?: number }; grandTotal?: number }
    | null
    | undefined;
  const total = s?.pricing?.grandTotal ?? s?.grandTotal ?? null;
  return total == null ? null : String(total);
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
        propertyId: bids.propertyId,
        primaryContactId: bids.primaryContactId,
        deliveryStatus: bids.deliveryStatus,
        contractValue: bids.contractValue,
        snapshot: proposals.snapshot,
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

    // The bid row IS the project (property-rooted re-model, Phase 3). On
    // accept we enter the delivery phase on the same row instead of creating
    // a separate projects record. delivery_status is set only if not already
    // present, so a re-accept under any race never clobbers in-flight
    // delivery state (replaces the old ON CONFLICT DO NOTHING idempotency).
    await tx
      .update(bids)
      .set(
        outcome === "won"
          ? {
              status: outcome,
              updatedAt: now,
              deliveryStatus: existing.deliveryStatus ?? "not_started",
              acceptedByName: updatedShare.acceptedByName,
              acceptedByTitle: updatedShare.acceptedByTitle,
              acceptedAt: updatedShare.acceptedAt,
              // Snapshot the contract baseline once (immutable); a re-accept
              // under any race keeps the original via the ?? guard.
              contractValue:
                existing.contractValue ?? snapshotTotal(existing.snapshot),
            }
          : { status: outcome, updatedAt: now },
      )
      .where(eq(bids.id, existing.bidId));
    await tx.insert(auditLog).values({
      userId: existing.bidUserId,
      actorUserId: existing.bidUserId,
      entityType: "bid",
      entityId: existing.bidId,
      action: "update",
      changedFields: ["status"],
      newValues: { status: outcome },
      source: "proposal_share",
    });

    if (existing.leadId) {
      await tx
        .update(leads)
        .set({
          status: outcome,
          closedAt: now,
          updatedAt: now,
        })
        .where(eq(leads.id, existing.leadId));
      await tx.insert(activityEvents).values({
        userId: existing.bidUserId,
        leadId: existing.leadId,
        contactId: existing.primaryContactId,
        propertyId: existing.propertyId,
        bidId: existing.bidId,
        type: "proposal_sent",
        title: outcome === "won" ? "Proposal accepted" : "Proposal declined",
        metadata: { outcome },
        occurredAt: now,
      });
      await tx.insert(auditLog).values({
        userId: existing.bidUserId,
        actorUserId: existing.bidUserId,
        entityType: "lead",
        entityId: existing.leadId,
        action: "update",
        changedFields: ["status", "closed_at"],
        newValues: { status: outcome, closedAt: now },
        source: "proposal_share",
      });
    }

    // The project's identity is the bid id (the bid row is the project).
    const projectId: string | null = outcome === "won" ? existing.bidId : null;

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

/**
 * The project as seen by the app — a view over the bid spine (the bid row IS
 * the project after the property-rooted re-model). `id` and `bidId` are the
 * same value. `status` is the delivery phase (non-null; only present once the
 * opportunity is won). `notes` maps to the bid's delivery_notes.
 */
export type ProjectView = {
  id: string;
  bidId: string;
  userId: string;
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
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Map a bid row to a ProjectView; null until the bid is won (delivery phase). */
function bidToProjectView(b: Bid): ProjectView | null {
  if (!b.deliveryStatus) return null;
  return {
    id: b.id,
    bidId: b.id,
    userId: b.userId,
    status: b.deliveryStatus,
    targetStartDate: b.targetStartDate,
    targetEndDate: b.targetEndDate,
    actualStartDate: b.actualStartDate,
    actualEndDate: b.actualEndDate,
    assignedSub: b.assignedSub,
    crewLeadName: b.crewLeadName,
    acceptedByName: b.acceptedByName,
    acceptedByTitle: b.acceptedByTitle,
    acceptedAt: b.acceptedAt,
    notes: b.deliveryNotes,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export async function getProjectByBidId(
  bidId: string
): Promise<ProjectView | null> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.userId, user.ownerUserId)))
    .limit(1);
  if (!rows[0]) return null;
  return bidToProjectView(rows[0]);
}

export type ProjectWithBid = {
  project: ProjectView;
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
  const conditions: SQL[] = [
    eq(bids.userId, user.ownerUserId),
    sql`${bids.deliveryStatus} is not null`,
  ];
  if (options.status)
    conditions.push(eq(bids.deliveryStatus, options.status));

  const baseQuery = db
    .select()
    .from(bids)
    .where(and(...conditions)!)
    .orderBy(desc(bids.updatedAt), desc(bids.id));

  const rows =
    options.limit != null || options.offset != null
      ? await baseQuery
          .limit(Math.max(1, options.limit ?? 100))
          .offset(Math.max(0, options.offset ?? 0))
      : await baseQuery;

  return rows.flatMap((b) => {
    const project = bidToProjectView(b);
    if (!project) return [];
    return [
      {
        project,
        bid: {
          id: b.id,
          propertyName: b.propertyName,
          address: b.address,
          clientName: b.clientName,
          leadId: b.leadId,
          status: b.status,
        },
      },
    ];
  });
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
    .select()
    .from(bids)
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)))
    .limit(1);
  const b = rows[0];
  if (!b) return null;
  const project = bidToProjectView(b);
  if (!project) return null;
  return {
    project,
    bid: {
      id: b.id,
      propertyName: b.propertyName,
      address: b.address,
      clientName: b.clientName,
      leadId: b.leadId,
      status: b.status,
    },
  };
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
): Promise<ProjectView | null> {
  const user = await requireUser();
  const existing = await db
    .select()
    .from(bids)
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)))
    .limit(1);
  const current = existing[0];
  if (!current || !current.deliveryStatus) return null;

  if (current.deliveryStatus === next) return bidToProjectView(current);
  const allowed = allowedProjectStatusTransitions(current.deliveryStatus);
  if (!allowed.includes(next)) {
    throw new Error(
      `Invalid status transition: ${current.deliveryStatus} → ${next}`
    );
  }

  // Pre-start checklist gate: NTO recipient + legal owner name/address must
  // be set before the project can leave not_started for in_progress. NTO is a
  // lien-rights instrument; starting work without it on file is the kind of
  // mistake that costs lien rights.
  if (current.deliveryStatus === "not_started" && next === "in_progress") {
    const pre = await getProjectPreStart(id);
    if (!pre || !isProjectStartReady(pre)) {
      throw new Error(
        "Pre-start checklist incomplete: set the legal owner name, owner address, and NTO recipient before starting the project.",
      );
    }
  }

  const now = new Date();
  const patch: Partial<typeof bids.$inferInsert> = {
    deliveryStatus: next,
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
  if (current.deliveryStatus === "complete" && next !== "complete") {
    patch.actualEndDate = null;
  }

  const rows = await db
    .update(bids)
    .set(patch)
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)))
    .returning();
  return rows[0] ? bidToProjectView(rows[0]) : null;
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
): Promise<ProjectView | null> {
  const user = await requireUser();
  const rows = await db
    .update(bids)
    .set({
      targetStartDate: data.targetStartDate,
      targetEndDate: data.targetEndDate,
      assignedSub: data.assignedSub,
      crewLeadName: data.crewLeadName,
      deliveryNotes: data.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(bids.id, id), eq(bids.userId, user.ownerUserId)))
    .returning();
  return rows[0] ? bidToProjectView(rows[0]) : null;
}

/**
 * All updates for a project, newest first. Caller is responsible for
 * having already confirmed the project belongs to the requesting user
 * (typically via getProject()).
 */
export async function getProjectUpdates(
  bidId: string
): Promise<ProjectUpdate[]> {
  return db
    .select()
    .from(projectUpdates)
    .where(eq(projectUpdates.bidId, bidId))
    .orderBy(desc(projectUpdates.createdAt));
}

export async function createProjectUpdate(
  bidId: string,
  data: { body: string; visibleOnPublicUrl: boolean }
): Promise<ProjectUpdate> {
  const user = await requireUser();
  // Ownership check: only the bid (project) owner can append updates, and
  // only once it's in the delivery phase.
  const owned = await db
    .select({ id: bids.id, deliveryStatus: bids.deliveryStatus })
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.userId, user.ownerUserId)))
    .limit(1);
  if (!owned[0] || !owned[0].deliveryStatus) {
    throw new Error("Project not found");
  }

  const authorName = user.email ?? "Unknown";
  const rows = await db
    .insert(projectUpdates)
    .values({
      bidId,
      authorType: "human",
      authorName,
      body: data.body,
      visibleOnPublicUrl: data.visibleOnPublicUrl,
    })
    .returning();
  // Touch the parent so list-view ordering reflects activity.
  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, bidId));
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
      id: bids.id,
      status: bids.deliveryStatus,
      targetStartDate: bids.targetStartDate,
      targetEndDate: bids.targetEndDate,
      actualStartDate: bids.actualStartDate,
      actualEndDate: bids.actualEndDate,
      assignedSub: bids.assignedSub,
      crewLeadName: bids.crewLeadName,
      acceptedByName: bids.acceptedByName,
      acceptedByTitle: bids.acceptedByTitle,
      acceptedAt: bids.acceptedAt,
    })
    .from(bids)
    .where(eq(bids.id, bidId))
    .limit(1);
  const project = projectRows[0];
  if (!project || !project.status) return null;

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
        eq(projectUpdates.bidId, project.id),
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
/** Delivery phase — lives on the bid spine now (bids.delivery_status). */
export type ProjectStatus = NonNullable<
  (typeof bids.$inferSelect)["deliveryStatus"]
>;

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
    .where(eq(bids.userId, user.ownerUserId))
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
      status: bids.deliveryStatus,
      count: sql<number>`count(*)::int`,
      overdue: sql<number>`count(*) filter (where ${bids.targetEndDate} is not null and ${bids.targetEndDate} < current_date and ${bids.deliveryStatus} <> 'complete')::int`,
    })
    .from(bids)
    .where(
      and(
        eq(bids.userId, user.ownerUserId),
        sql`${bids.deliveryStatus} is not null`,
      ),
    )
    .groupBy(bids.deliveryStatus);

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
    if (!row.status) continue;
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
        ? and(eq(leads.userId, user.ownerUserId), eq(leads.sourceTag, tag))
        : eq(leads.userId, user.ownerUserId)
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

// ── Dashboard recents ──

export type DashboardRecentKind = "Lead" | "Bid" | "Project";

export type DashboardRecent = {
  id: string;
  kind: DashboardRecentKind;
  title: string;
  sub: string;
  updatedAt: Date;
  href: string;
};

/**
 * "Jump back in" feed for the dashboard hero. Returns the user's most
 * recently touched leads, bids, and projects (bids with delivery_status)
 * merged into one list by `updated_at` desc.
 *
 * TODO Phase 2: include accounts/contacts; switch ranking to an
 * activity-feed table once one exists, so opens/views also bubble up.
 */
export async function getDashboardRecents(
  limit = 5,
): Promise<DashboardRecent[]> {
  const user = await requireUser();
  const perTableLimit = Math.max(limit, 5);

  const [leadRows, bidRows] = await Promise.all([
    db
      .select({
        id: leads.id,
        name: leads.name,
        propertyName: leads.propertyName,
        status: leads.status,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .where(eq(leads.userId, user.ownerUserId))
      .orderBy(desc(leads.updatedAt), desc(leads.id))
      .limit(perTableLimit),
    db
      .select({
        id: bids.id,
        propertyName: bids.propertyName,
        clientName: bids.clientName,
        status: bids.status,
        deliveryStatus: bids.deliveryStatus,
        updatedAt: bids.updatedAt,
      })
      .from(bids)
      .where(eq(bids.userId, user.ownerUserId))
      .orderBy(desc(bids.updatedAt), desc(bids.id))
      .limit(perTableLimit),
  ]);

  const merged: DashboardRecent[] = [
    ...leadRows.map<DashboardRecent>((l) => ({
      id: l.id,
      kind: "Lead",
      title: l.propertyName?.trim() || l.name,
      sub: l.status ? l.status.replace(/_/g, " ") : "Lead",
      updatedAt: l.updatedAt,
      href: `/leads/${l.id}`,
    })),
    ...bidRows.map<DashboardRecent>((b) => {
      const isProject = b.deliveryStatus != null;
      const statusLabel = (isProject ? b.deliveryStatus! : b.status).replace(
        /_/g,
        " ",
      );
      return {
        id: b.id,
        kind: isProject ? "Project" : "Bid",
        title: b.propertyName || b.clientName,
        sub: statusLabel,
        updatedAt: b.updatedAt,
        href: isProject ? `/projects/${b.id}` : `/bids/${b.id}`,
      };
    }),
  ];

  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return merged.slice(0, limit);
}

export type OverdueFollowUp = {
  leadId: string;
  name: string;
  propertyName: string | null;
  company: string | null;
  /** ISO YYYY-MM-DD. */
  followUpAt: string;
  daysLate: number;
};

/**
 * Open leads whose follow-up date is in the past (excludes won/lost). Powers
 * the dashboard "Show overdue" sheet; ordered most-overdue first.
 */
export async function getOverdueFollowUps(
  limit = 20,
): Promise<OverdueFollowUp[]> {
  const user = await requireUser();
  const capped = Math.min(Math.max(limit, 1), 100);

  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      propertyName: leads.propertyName,
      company: leads.company,
      followUpAt: leads.followUpAt,
      daysLate: sql<number>`(current_date - ${leads.followUpAt})::int`,
    })
    .from(leads)
    .where(
      and(
        eq(leads.userId, user.ownerUserId),
        sql`${leads.followUpAt} < current_date`,
        sql`${leads.status} not in ('won', 'lost')`,
      ),
    )
    .orderBy(leads.followUpAt)
    .limit(capped);

  return rows.map((r) => ({
    leadId: r.id,
    name: r.name,
    propertyName: r.propertyName,
    company: r.company,
    followUpAt: r.followUpAt as string,
    daysLate: Number(r.daysLate),
  }));
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

// ── Contacts ──

/** Hard ceiling on `limit` — a tampered URL can't pull the whole table. */
export const CONTACTS_PAGE_MAX_LIMIT = 500;
/** Default page size when the caller doesn't specify one. */
export const CONTACTS_PAGE_DEFAULT_LIMIT = 100;

export const CONTACTS_SORTS = ["recent", "name"] as const;
export type ContactsSort = (typeof CONTACTS_SORTS)[number];

export type GetContactsOptions = {
  q?: string | null;
  sourceTag?: string | null;
  sort?: ContactsSort | null;
  limit?: number;
  offset?: number;
};

export type ContactListRow = {
  contact: Contact;
  accountName: string | null;
  propertyCount: number;
  leadCount: number;
  nextFollowUpAt: string | null;
  lastContactedAt: Date | null;
};

export type GetContactsResult = {
  rows: ContactListRow[];
  total: number;
  limit: number;
  offset: number;
};

export type LeadPropertyGroup = {
  key: string;
  accountId: string | null;
  propertyId: string | null;
  address: string | null;
  managementCompany: string | null;
  propertyName: string | null;
  contacts: Lead[];
  contactCount: number;
  portfolioCount: number | null;
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

function clampContactLimit(limit: number | undefined): number {
  return Math.max(
    1,
    Math.min(limit ?? CONTACTS_PAGE_DEFAULT_LIMIT, CONTACTS_PAGE_MAX_LIMIT),
  );
}

function clampOffset(offset: number | undefined): number {
  return Math.max(0, offset ?? 0);
}

function contactListConditions(userId: string, options: GetContactsOptions): SQL[] {
  const conditions: SQL[] = [eq(contacts.userId, userId)];

  const sourceTag = options.sourceTag?.trim() || null;
  if (sourceTag) conditions.push(eq(contacts.sourceTag, sourceTag));

  const q = options.q?.trim() || null;
  if (q) {
    const needle = `%${escapeIlike(q)}%`;
    const propertyMatch = sql`exists (
      select 1
      from ${propertyContacts}
      inner join ${properties} on ${properties.id} = ${propertyContacts.propertyId}
      where ${propertyContacts.contactId} = ${contacts.id}
        and ${propertyContacts.userId} = ${userId}
        and ${propertyContacts.active} = true
        and (
          ${properties.name} ilike ${needle}
          or ${properties.address} ilike ${needle}
        )
    )`;
    const searchable = or(
      ilike(contacts.name, needle),
      ilike(contacts.email, needle),
      ilike(contacts.phone, needle),
      ilike(contacts.title, needle),
      ilike(contacts.sourceTag, needle),
      ilike(accounts.name, needle),
      propertyMatch,
    );
    if (searchable) conditions.push(searchable);
  }

  return conditions;
}

function contactRowOrderBy(sort: ContactsSort): SQL[] {
  switch (sort) {
    case "name":
      return [asc(contacts.name), desc(contacts.createdAt), desc(contacts.id)];
    case "recent":
    default:
      return [desc(contacts.createdAt), desc(contacts.id)];
  }
}

export async function getContacts(
  options: GetContactsOptions = {},
): Promise<GetContactsResult> {
  const user = await requireUser();
  const limit = clampContactLimit(options.limit);
  const offset = clampOffset(options.offset);
  const conditions = contactListConditions(user.ownerUserId, options);
  const where = and(...conditions)!;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        contact: contacts,
        accountName: accounts.name,
      })
      .from(contacts)
      .leftJoin(
        accounts,
        and(
          eq(accounts.id, contacts.accountId),
          eq(accounts.userId, user.ownerUserId),
        ),
      )
      .where(where)
      .orderBy(...contactRowOrderBy(options.sort ?? "recent"))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(distinct ${contacts.id})::int` })
      .from(contacts)
      .leftJoin(
        accounts,
        and(
          eq(accounts.id, contacts.accountId),
          eq(accounts.userId, user.ownerUserId),
        ),
      )
      .where(where),
  ]);

  const contactIds = rows.map((row) => row.contact.id);
  if (contactIds.length === 0) {
    return {
      rows: [],
      total: Number(totalRows[0]?.count ?? 0),
      limit,
      offset,
    };
  }

  const [propertyCountRows, leadRollupRows] = await Promise.all([
    db
      .select({
        contactId: propertyContacts.contactId,
        count: sql<number>`count(distinct ${propertyContacts.propertyId})::int`.as(
          "count",
        ),
      })
      .from(propertyContacts)
      .where(
        and(
          eq(propertyContacts.userId, user.ownerUserId),
          eq(propertyContacts.active, true),
          inArray(propertyContacts.contactId, contactIds),
        ),
      )
      .groupBy(propertyContacts.contactId),
    db
      .select({
        contactId: leads.primaryContactId,
        leadCount: sql<number>`count(*)::int`.as("lead_count"),
        nextFollowUpAt: sql<string | null>`min(${leads.followUpAt})::text`.as(
          "next_follow_up_at",
        ),
        lastContactedAt: sql<Date | null>`max(${leads.lastContactedAt})`.as(
          "last_contacted_at",
        ),
      })
      .from(leads)
      .where(
        and(
          eq(leads.userId, user.ownerUserId),
          inArray(leads.primaryContactId, contactIds),
        ),
      )
      .groupBy(leads.primaryContactId),
  ]);

  const propertyCountByContactId = new Map(
    propertyCountRows.map((row) => [row.contactId, Number(row.count)]),
  );
  const leadRollupByContactId = new Map(
    leadRollupRows.flatMap((row) =>
      row.contactId
        ? [
            [
              row.contactId,
              {
                leadCount: Number(row.leadCount),
                nextFollowUpAt: row.nextFollowUpAt,
                lastContactedAt: row.lastContactedAt,
              },
            ] as const,
          ]
        : [],
    ),
  );

  return {
    rows: rows.map(({ contact, accountName }) => {
      const leadRollup = leadRollupByContactId.get(contact.id);
      return {
        contact,
        accountName,
        propertyCount: propertyCountByContactId.get(contact.id) ?? 0,
        leadCount: leadRollup?.leadCount ?? 0,
        nextFollowUpAt: leadRollup?.nextFollowUpAt ?? null,
        lastContactedAt: leadRollup?.lastContactedAt ?? null,
      };
    }),
    total: Number(totalRows[0]?.count ?? 0),
    limit,
    offset,
  };
}

export async function getContactSourceOptions(): Promise<LeadSourceOption[]> {
  const user = await requireUser();
  const rows = await db
    .selectDistinct({
      value: contacts.sourceTag,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, user.ownerUserId),
        sql`${contacts.sourceTag} is not null`,
        sql`btrim(${contacts.sourceTag}) <> ''`,
      ),
    )
    .orderBy(asc(contacts.sourceTag));

  return rows.flatMap((row) => {
    const value = row.value?.trim();
    return value ? [{ label: value, value }] : [];
  });
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
  const conditions = leadListConditions(user.ownerUserId, options);

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
        eq(leads.userId, user.ownerUserId),
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
  const conditions = leadListConditions(user.ownerUserId, options);
  const where = and(...conditions)!;

  const grouped = db
    .select({
      key: leadPropertyGroupKey.as("key"),
      accountId: sql<string | null>`min(${leads.accountId}::text)`.as("account_id"),
      propertyId: sql<string | null>`min(${leads.propertyId}::text)`.as("property_id"),
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
  const accountIds = groups.flatMap((group) => group.accountId ? [group.accountId] : []);
  const portfolioRows =
    accountIds.length > 0
      ? await db
          .select({
            accountId: properties.accountId,
            count: sql<number>`count(distinct ${properties.id})::int`.as("count"),
          })
          .from(properties)
          .where(
            and(
              eq(properties.userId, user.ownerUserId),
              inArray(properties.accountId, accountIds),
            ),
          )
          .groupBy(properties.accountId)
      : [];
  const portfolioCountByAccountId = new Map(
    portfolioRows.flatMap((row) =>
      row.accountId ? [[row.accountId, Number(row.count)] as const] : [],
    ),
  );
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
      accountId: group.accountId,
      propertyId: group.propertyId,
      address: group.address,
      managementCompany: group.managementCompany,
      propertyName: group.propertyName,
      contacts: contactsByGroup.get(group.key) ?? [],
      contactCount: Number(group.contactCount),
      portfolioCount: group.accountId
        ? portfolioCountByAccountId.get(group.accountId) ?? null
        : null,
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
        | "resolvedAddress"
        | "notes"
        | "isLargeJob"
        | "scopeCategory"
        | "estValue"
      >
    > & { accountId?: string | null }
) {
  const user = await requireUser();
  let account: Account | null = null;
  if (data.accountId) {
    const existing = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, data.accountId),
          eq(accounts.userId, user.ownerUserId),
        ),
      )
      .limit(1);
    account = existing[0] ?? null;
  }
  if (!account) {
    account = await findOrCreateAccount({
      userId: user.ownerUserId,
      name: data.company,
      sourceTag: data.sourceTag ?? null,
    });
  }
  const property = await findOrCreateProperty({
    userId: user.ownerUserId,
    accountId: account?.id ?? null,
    name: data.propertyName,
    address: data.resolvedAddress,
    sourceTag: data.sourceTag ?? null,
  });
  const contact = await findOrCreateContact({
    userId: user.ownerUserId,
    accountId: account?.id ?? null,
    name: data.name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    sourceTag: data.sourceTag ?? null,
  });
  const propertyContact = await upsertPropertyContact({
    userId: user.ownerUserId,
    propertyId: property?.id ?? null,
    contactId: contact.id,
    sourceTag: data.sourceTag ?? null,
  });
  const rows = await db
    .insert(leads)
    .values({
      userId: user.ownerUserId,
      accountId: account?.id ?? null,
      propertyId: property?.id ?? null,
      primaryContactId: contact.id,
      name: data.name,
      sourceTag: data.sourceTag ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      propertyName: data.propertyName ?? null,
      resolvedAddress: data.resolvedAddress ?? null,
      notes: data.notes ?? "",
      isLargeJob: data.isLargeJob ?? false,
      scopeCategory: data.scopeCategory ?? null,
      estValue: data.estValue ?? null,
      // Rep follows the firm: inherit the management company's rep as owner.
      ownerId: account?.internalRepId ?? null,
    })
    .returning();
  await createLeadContactLink({
    userId: user.ownerUserId,
    leadId: rows[0].id,
    contactId: contact.id,
    propertyContactId: propertyContact?.id ?? null,
    role: "primary",
    isPrimary: true,
  });
  await createActivityEvent({
    userId: user.ownerUserId,
    leadId: rows[0].id,
    contactId: contact.id,
    propertyId: property?.id ?? null,
    accountId: account?.id ?? null,
    type: "note",
    title: "Lead created",
    body: data.notes ?? "",
  });
  await writeAuditLog({
    userId: user.ownerUserId,
    entityType: "lead",
    entityId: rows[0].id,
    action: "create",
    newValues: rows[0],
  });
  return rows[0];
}

export async function getLead(id: string) {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.userId, user.ownerUserId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatestBidForLead(leadId: string) {
  const user = await requireUser();
  const rows = await db
    .select({ id: bids.id, status: bids.status, updatedAt: bids.updatedAt })
    .from(bids)
    .where(and(eq(bids.userId, user.ownerUserId), eq(bids.leadId, leadId)))
    .orderBy(desc(bids.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

// ── Entity detail panels (Account / Property / Contact) ────────────────────
//
// These power the leads page side-panel views. Each returns the entity plus
// the immediate graph neighbours needed for cross-linking: an account knows
// its properties and contacts; a property knows its account, contacts, and
// inbound leads; a contact knows its account, properties, and leads. Status
// rollups come from the leads table (the inbound signal), which is what the
// pipeline view in the panels surfaces.

export type LeadSummary = Pick<
  Lead,
  "id" | "name" | "status" | "followUpAt" | "lastContactedAt" | "createdAt"
>;

export type AccountPropertySummary = {
  property: Property;
  contactCount: number;
  leadCount: number;
  earliestFollowUp: string | null;
  pipeline: Array<{ status: LeadStatus; count: number }>;
};

export type AccountContactSummary = {
  contact: Contact;
  propertyCount: number;
  status: LeadStatus | null;
  followUpAt: string | null;
};

export type AccountDetail = {
  account: Account;
  properties: AccountPropertySummary[];
  contacts: AccountContactSummary[];
  leadCount: number;
};

export type PropertyContactSummary = {
  contact: Contact;
  role: string | null;
  status: LeadStatus | null;
  followUpAt: string | null;
  leadId: string | null;
};

export type PropertyDetail = {
  property: Property;
  /** Legacy single account (management company), kept for existing consumers. */
  account: Account | null;
  /** The management company (managementAccountId, falling back to accountId). */
  managementAccount: Account | null;
  /** The legal owner account, when the owner is a known account. */
  ownerAccount: Account | null;
  /** The owner party row (carries free-text legal owner + NTO contact link). */
  ownerParty: PropertyParty | null;
  /** Whichever party is flagged as the Notice-to-Owner recipient. */
  ntoParty: PropertyParty | null;
  contacts: PropertyContactSummary[];
  leads: LeadSummary[];
  portfolioCount: number;
};

export type ContactPropertySummary = {
  property: Property;
  role: string | null;
  status: LeadStatus | null;
  followUpAt: string | null;
};

export type ContactDetail = {
  contact: Contact;
  account: Account | null;
  properties: ContactPropertySummary[];
  leads: LeadSummary[];
};

export async function getAccountDetail(
  id: string,
): Promise<AccountDetail | null> {
  const user = await requireUser();
  const accountRows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.ownerUserId)))
    .limit(1);
  const account = accountRows[0];
  if (!account) return null;

  const propertyRows = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.accountId, account.id),
        eq(properties.userId, user.ownerUserId),
      ),
    )
    .orderBy(asc(properties.name), asc(properties.address));

  const propertyIds = propertyRows.map((p) => p.id);

  const [contactCountsByProperty, leadAggByProperty] = await Promise.all([
    propertyIds.length
      ? db
          .select({
            propertyId: propertyContacts.propertyId,
            count: sql<number>`count(distinct ${propertyContacts.contactId})::int`.as(
              "count",
            ),
          })
          .from(propertyContacts)
          .where(
            and(
              eq(propertyContacts.userId, user.ownerUserId),
              eq(propertyContacts.active, true),
              inArray(propertyContacts.propertyId, propertyIds),
            ),
          )
          .groupBy(propertyContacts.propertyId)
      : Promise.resolve(
          [] as Array<{ propertyId: string; count: number }>,
        ),
    propertyIds.length
      ? db
          .select({
            propertyId: leads.propertyId,
            status: leads.status,
            count: sql<number>`count(*)::int`.as("count"),
            earliestFollowUp: sql<string | null>`min(${leads.followUpAt})::text`.as(
              "earliest_follow_up",
            ),
          })
          .from(leads)
          .where(
            and(
              eq(leads.userId, user.ownerUserId),
              inArray(leads.propertyId, propertyIds),
            ),
          )
          .groupBy(leads.propertyId, leads.status)
      : Promise.resolve(
          [] as Array<{
            propertyId: string | null;
            status: LeadStatus;
            count: number;
            earliestFollowUp: string | null;
          }>,
        ),
  ]);

  const contactCountByProperty = new Map(
    contactCountsByProperty.map(
      (row) => [row.propertyId, Number(row.count)] as const,
    ),
  );
  const pipelineByProperty = new Map<
    string,
    Array<{ status: LeadStatus; count: number }>
  >();
  const earliestByProperty = new Map<string, string | null>();
  const leadCountByProperty = new Map<string, number>();
  for (const row of leadAggByProperty) {
    if (!row.propertyId) continue;
    const list = pipelineByProperty.get(row.propertyId) ?? [];
    list.push({ status: row.status, count: Number(row.count) });
    pipelineByProperty.set(row.propertyId, list);
    leadCountByProperty.set(
      row.propertyId,
      (leadCountByProperty.get(row.propertyId) ?? 0) + Number(row.count),
    );
    const prevEarliest = earliestByProperty.get(row.propertyId) ?? null;
    if (
      row.earliestFollowUp &&
      (!prevEarliest || row.earliestFollowUp < prevEarliest)
    ) {
      earliestByProperty.set(row.propertyId, row.earliestFollowUp);
    }
  }

  const contactRows = await db
    .select({
      contact: contacts,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.accountId, account.id),
        eq(contacts.userId, user.ownerUserId),
      ),
    )
    .orderBy(asc(contacts.name));

  const accountContactIds = contactRows.map((row) => row.contact.id);

  const [contactPropertyCountRows, contactLatestLeadRows] = await Promise.all([
    accountContactIds.length
      ? db
          .select({
            contactId: propertyContacts.contactId,
            count: sql<number>`count(distinct ${propertyContacts.propertyId})::int`.as(
              "count",
            ),
          })
          .from(propertyContacts)
          .where(
            and(
              eq(propertyContacts.userId, user.ownerUserId),
              eq(propertyContacts.active, true),
              inArray(propertyContacts.contactId, accountContactIds),
            ),
          )
          .groupBy(propertyContacts.contactId)
      : Promise.resolve(
          [] as Array<{ contactId: string; count: number }>,
        ),
    accountContactIds.length
      ? db
          .selectDistinctOn([leads.primaryContactId], {
            contactId: leads.primaryContactId,
            status: leads.status,
            followUpAt: sql<string | null>`${leads.followUpAt}::text`.as(
              "follow_up_at",
            ),
          })
          .from(leads)
          .where(
            and(
              eq(leads.userId, user.ownerUserId),
              inArray(leads.primaryContactId, accountContactIds),
            ),
          )
          .orderBy(
            leads.primaryContactId,
            sql`${leads.lastContactedAt} desc nulls last`,
            desc(leads.createdAt),
          )
      : Promise.resolve(
          [] as Array<{
            contactId: string | null;
            status: LeadStatus;
            followUpAt: string | null;
          }>,
        ),
  ]);

  const contactPropertyCount = new Map(
    contactPropertyCountRows.map(
      (row) => [row.contactId, Number(row.count)] as const,
    ),
  );
  const contactLatestLead = new Map(
    contactLatestLeadRows.flatMap((row) =>
      row.contactId
        ? ([
            [
              row.contactId,
              { status: row.status, followUpAt: row.followUpAt },
            ] as const,
          ] as const)
        : [],
    ),
  );

  const propertySummaries: AccountPropertySummary[] = propertyRows.map((p) => ({
    property: p,
    contactCount: contactCountByProperty.get(p.id) ?? 0,
    leadCount: leadCountByProperty.get(p.id) ?? 0,
    earliestFollowUp: earliestByProperty.get(p.id) ?? null,
    pipeline: pipelineByProperty.get(p.id) ?? [],
  }));

  const contactSummaries: AccountContactSummary[] = contactRows.map(
    ({ contact }) => {
      const latest = contactLatestLead.get(contact.id);
      return {
        contact,
        propertyCount: contactPropertyCount.get(contact.id) ?? 0,
        status: latest?.status ?? null,
        followUpAt: latest?.followUpAt ?? null,
      };
    },
  );

  const leadCount = Array.from(leadCountByProperty.values()).reduce(
    (sum, n) => sum + n,
    0,
  );

  return {
    account,
    properties: propertySummaries,
    contacts: contactSummaries,
    leadCount,
  };
}

export async function getPropertyDetail(
  id: string,
): Promise<PropertyDetail | null> {
  const user = await requireUser();
  const propertyRows = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.userId, user.ownerUserId)))
    .limit(1);
  const property = propertyRows[0];
  if (!property) return null;

  const referencedAccountIds = Array.from(
    new Set(
      [
        property.accountId,
        property.managementAccountId,
        property.ownerAccountId,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const [accountRows, contactRows, leadRows, portfolioCountRows, partyRows] =
    await Promise.all([
      referencedAccountIds.length
        ? db
            .select()
            .from(accounts)
            .where(
              and(
                inArray(accounts.id, referencedAccountIds),
                eq(accounts.userId, user.ownerUserId),
              ),
            )
        : Promise.resolve([] as Account[]),
      db
        .select({
          contact: contacts,
          role: propertyContacts.role,
        })
        .from(propertyContacts)
        .innerJoin(contacts, eq(contacts.id, propertyContacts.contactId))
        .where(
          and(
            eq(propertyContacts.propertyId, property.id),
            eq(propertyContacts.userId, user.ownerUserId),
            eq(propertyContacts.active, true),
          ),
        )
        .orderBy(asc(contacts.name)),
      db
        .select({
          id: leads.id,
          name: leads.name,
          status: leads.status,
          followUpAt: leads.followUpAt,
          lastContactedAt: leads.lastContactedAt,
          createdAt: leads.createdAt,
          primaryContactId: leads.primaryContactId,
        })
        .from(leads)
        .where(
          and(
            eq(leads.userId, user.ownerUserId),
            eq(leads.propertyId, property.id),
          ),
        )
        .orderBy(desc(leads.createdAt)),
      property.accountId
        ? db
            .select({
              count: sql<number>`count(*)::int`.as("count"),
            })
            .from(properties)
            .where(
              and(
                eq(properties.accountId, property.accountId),
                eq(properties.userId, user.ownerUserId),
              ),
            )
        : Promise.resolve([{ count: 1 }]),
      db
        .select()
        .from(propertyParties)
        .where(
          and(
            eq(propertyParties.propertyId, property.id),
            eq(propertyParties.userId, user.ownerUserId),
          ),
        ),
    ]);

  const accountById = new Map(accountRows.map((a) => [a.id, a] as const));
  const managementAccount =
    accountById.get(
      property.managementAccountId ?? property.accountId ?? "",
    ) ?? null;
  const ownerAccount = property.ownerAccountId
    ? (accountById.get(property.ownerAccountId) ?? null)
    : null;
  const ownerParty = partyRows.find((p) => p.role === "owner") ?? null;
  const ntoParty = partyRows.find((p) => p.isNtoRecipient) ?? null;

  const latestLeadByContactId = new Map<
    string,
    { status: LeadStatus; followUpAt: string | null; leadId: string }
  >();
  for (const lead of leadRows) {
    if (!lead.primaryContactId) continue;
    if (latestLeadByContactId.has(lead.primaryContactId)) continue;
    latestLeadByContactId.set(lead.primaryContactId, {
      status: lead.status,
      followUpAt: lead.followUpAt,
      leadId: lead.id,
    });
  }

  const contactSummaries: PropertyContactSummary[] = contactRows.map(
    ({ contact, role }) => {
      const latest = latestLeadByContactId.get(contact.id);
      return {
        contact,
        role,
        status: latest?.status ?? null,
        followUpAt: latest?.followUpAt ?? null,
        leadId: latest?.leadId ?? null,
      };
    },
  );

  return {
    property,
    account:
      (property.accountId ? accountById.get(property.accountId) : null) ??
      managementAccount ??
      null,
    managementAccount,
    ownerAccount,
    ownerParty,
    ntoParty,
    contacts: contactSummaries,
    leads: leadRows.map(
      ({ id, name, status, followUpAt, lastContactedAt, createdAt }) => ({
        id,
        name,
        status,
        followUpAt,
        lastContactedAt,
        createdAt,
      }),
    ),
    portfolioCount: Number(portfolioCountRows[0]?.count ?? 0),
  };
}

/**
 * Set which contact at a property is the **owner** (or owner's
 * representative). Lead/sales-side concern — captured early in the funnel.
 * Stored as the `owner` `property_parties` row's `contact_id`. Does not
 * touch NTO, legal owner name, or legal owner address (those live on the
 * `nto_recipient` row and are captured later via `setProjectNto` at the
 * pre-project-start checklist). Scoped + ownership-guarded by the org owner.
 */
export async function setPropertyOwnerContact(input: {
  propertyId: string;
  contactId: string | null;
}): Promise<void> {
  const user = await requireUser();

  const propRows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, input.propertyId),
        eq(properties.userId, user.ownerUserId),
      ),
    )
    .limit(1);
  if (!propRows[0]) throw new Error("Property not found");

  // Contact must already be linked to this property.
  let contactId: string | null = null;
  if (input.contactId) {
    const linked = await db
      .select({ id: propertyContacts.id })
      .from(propertyContacts)
      .where(
        and(
          eq(propertyContacts.userId, user.ownerUserId),
          eq(propertyContacts.propertyId, input.propertyId),
          eq(propertyContacts.contactId, input.contactId),
        ),
      )
      .limit(1);
    if (linked[0]) contactId = input.contactId;
  }

  const existing = await db
    .select()
    .from(propertyParties)
    .where(
      and(
        eq(propertyParties.userId, user.ownerUserId),
        eq(propertyParties.propertyId, input.propertyId),
        eq(propertyParties.role, "owner"),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(propertyParties)
      .set({ contactId, updatedAt: new Date() })
      .where(eq(propertyParties.id, existing[0].id));
    await writeAuditLog({
      userId: user.ownerUserId,
      actorUserId: user.userId,
      entityType: "property_party",
      entityId: existing[0].id,
      action: "update",
      previousValues: existing[0],
      newValues: { contactId },
    });
  } else {
    const inserted = await db
      .insert(propertyParties)
      .values({
        userId: user.ownerUserId,
        propertyId: input.propertyId,
        role: "owner",
        contactId,
      })
      .returning();
    await writeAuditLog({
      userId: user.ownerUserId,
      actorUserId: user.userId,
      entityType: "property_party",
      entityId: inserted[0].id,
      action: "create",
      newValues: inserted[0],
    });
  }
}

/**
 * Set the project pre-start NTO block: who NTO is served to (the contact),
 * plus the legal owner name and address NTO must reach (the lienable party).
 * Bid-id keyed because this is project-side; resolves to the bid's property.
 * Stored on the `nto_recipient` `property_parties` row (separate from the
 * lead-side `owner` row, which only carries the owner-rep contact). The
 * partial-unique index enforces one NTO recipient per property. Throws if
 * the bid has no property or if a passed contact isn't linked to it.
 */
export async function setProjectNto(input: {
  bidId: string;
  legalOwnerName: string | null;
  legalOwnerAddress: string | null;
  ntoContactId: string | null;
}): Promise<void> {
  const user = await requireUser();

  const bidRows = await db
    .select({ id: bids.id, propertyId: bids.propertyId })
    .from(bids)
    .where(and(eq(bids.id, input.bidId), eq(bids.userId, user.ownerUserId)))
    .limit(1);
  const bid = bidRows[0];
  if (!bid) throw new Error("Bid not found");
  if (!bid.propertyId) throw new Error("Bid is not attached to a property");

  const legalOwnerName = cleanText(input.legalOwnerName) ?? null;
  const legalOwnerAddress = cleanText(input.legalOwnerAddress) ?? null;

  let ntoContactId: string | null = null;
  if (input.ntoContactId) {
    const linked = await db
      .select({ id: propertyContacts.id })
      .from(propertyContacts)
      .where(
        and(
          eq(propertyContacts.userId, user.ownerUserId),
          eq(propertyContacts.propertyId, bid.propertyId),
          eq(propertyContacts.contactId, input.ntoContactId),
        ),
      )
      .limit(1);
    if (linked[0]) ntoContactId = input.ntoContactId;
  }

  // Clear any stale is_nto_recipient flag elsewhere (legacy data may have
  // had it on the owner row from before the lead/project split).
  await db
    .update(propertyParties)
    .set({ isNtoRecipient: false, updatedAt: new Date() })
    .where(
      and(
        eq(propertyParties.userId, user.ownerUserId),
        eq(propertyParties.propertyId, bid.propertyId),
        eq(propertyParties.isNtoRecipient, true),
      ),
    );

  const existing = await db
    .select()
    .from(propertyParties)
    .where(
      and(
        eq(propertyParties.userId, user.ownerUserId),
        eq(propertyParties.propertyId, bid.propertyId),
        eq(propertyParties.role, "nto_recipient"),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(propertyParties)
      .set({
        legalOwnerName,
        legalOwnerAddress,
        contactId: ntoContactId,
        isNtoRecipient: true,
        updatedAt: new Date(),
      })
      .where(eq(propertyParties.id, existing[0].id));
    await writeAuditLog({
      userId: user.ownerUserId,
      actorUserId: user.userId,
      entityType: "property_party",
      entityId: existing[0].id,
      action: "update",
      previousValues: existing[0],
      newValues: { legalOwnerName, legalOwnerAddress, contactId: ntoContactId },
    });
  } else {
    const inserted = await db
      .insert(propertyParties)
      .values({
        userId: user.ownerUserId,
        propertyId: bid.propertyId,
        role: "nto_recipient",
        isNtoRecipient: true,
        legalOwnerName,
        legalOwnerAddress,
        contactId: ntoContactId,
      })
      .returning();
    await writeAuditLog({
      userId: user.ownerUserId,
      actorUserId: user.userId,
      entityType: "property_party",
      entityId: inserted[0].id,
      action: "create",
      newValues: inserted[0],
    });
  }
}

/**
 * Pre-start checklist data for a project: the owner-rep contact captured at
 * the lead/property layer, the NTO block captured here, plus the contacts
 * available to pick from. Used by /projects/[id] to render the gate, and by
 * `assertProjectStartReady` to enforce it before flipping delivery_status to
 * in_progress.
 */
export type ProjectPreStart = {
  bidId: string;
  propertyId: string | null;
  ownerContact: { id: string; name: string } | null;
  nto: {
    legalOwnerName: string | null;
    legalOwnerAddress: string | null;
    contact: { id: string; name: string } | null;
  };
  propertyContactOptions: { id: string; name: string }[];
};

export async function getProjectPreStart(
  bidId: string,
): Promise<ProjectPreStart | null> {
  const user = await requireUser();

  const bidRows = await db
    .select({ id: bids.id, propertyId: bids.propertyId })
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.userId, user.ownerUserId)))
    .limit(1);
  const bid = bidRows[0];
  if (!bid) return null;
  if (!bid.propertyId) {
    return {
      bidId: bid.id,
      propertyId: null,
      ownerContact: null,
      nto: { legalOwnerName: null, legalOwnerAddress: null, contact: null },
      propertyContactOptions: [],
    };
  }

  const [partyRows, contactRows] = await Promise.all([
    db
      .select({
        role: propertyParties.role,
        legalOwnerName: propertyParties.legalOwnerName,
        legalOwnerAddress: propertyParties.legalOwnerAddress,
        contactId: propertyParties.contactId,
        contactName: contacts.name,
      })
      .from(propertyParties)
      .leftJoin(contacts, eq(contacts.id, propertyParties.contactId))
      .where(
        and(
          eq(propertyParties.propertyId, bid.propertyId),
          eq(propertyParties.userId, user.ownerUserId),
        ),
      ),
    db
      .select({ id: contacts.id, name: contacts.name })
      .from(propertyContacts)
      .innerJoin(contacts, eq(contacts.id, propertyContacts.contactId))
      .where(
        and(
          eq(propertyContacts.propertyId, bid.propertyId),
          eq(propertyContacts.userId, user.ownerUserId),
          eq(propertyContacts.active, true),
        ),
      )
      .orderBy(asc(contacts.name)),
  ]);

  const ownerRow = partyRows.find((p) => p.role === "owner") ?? null;
  const ntoRow = partyRows.find((p) => p.role === "nto_recipient") ?? null;

  return {
    bidId: bid.id,
    propertyId: bid.propertyId,
    ownerContact:
      ownerRow?.contactId && ownerRow.contactName
        ? { id: ownerRow.contactId, name: ownerRow.contactName }
        : null,
    nto: {
      legalOwnerName: ntoRow?.legalOwnerName ?? null,
      legalOwnerAddress: ntoRow?.legalOwnerAddress ?? null,
      contact:
        ntoRow?.contactId && ntoRow.contactName
          ? { id: ntoRow.contactId, name: ntoRow.contactName }
          : null,
    },
    propertyContactOptions: contactRows,
  };
}

export function isProjectStartReady(pre: ProjectPreStart): boolean {
  return Boolean(
    pre.propertyId &&
      pre.nto.legalOwnerName &&
      pre.nto.legalOwnerAddress &&
      pre.nto.contact,
  );
}

/**
 * Slim party block for a property, frozen into a proposal snapshot at
 * generate time. Returns null when the bid has no property attached. Keeps
 * `getPropertyDetail`'s heavier joins (contacts, leads, portfolio) off the
 * proposal hot path.
 */
export async function getProposalPartyBlock(
  propertyId: string,
): Promise<{
  managementCompany: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  ntoRecipientName: string | null;
} | null> {
  const user = await requireUser();

  const propRows = await db
    .select({
      managementAccountId: properties.managementAccountId,
      ownerAccountId: properties.ownerAccountId,
      accountId: properties.accountId,
    })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.userId, user.ownerUserId),
      ),
    )
    .limit(1);
  const property = propRows[0];
  if (!property) return null;

  const referencedAccountIds = Array.from(
    new Set(
      [
        property.managementAccountId ?? property.accountId,
        property.ownerAccountId,
      ].filter((v): v is string => Boolean(v)),
    ),
  );

  const [accountRows, partyRows] = await Promise.all([
    referencedAccountIds.length
      ? db
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(
            and(
              inArray(accounts.id, referencedAccountIds),
              eq(accounts.userId, user.ownerUserId),
            ),
          )
      : Promise.resolve([] as { id: string; name: string }[]),
    db
      .select({
        role: propertyParties.role,
        isNtoRecipient: propertyParties.isNtoRecipient,
        legalOwnerName: propertyParties.legalOwnerName,
        legalOwnerAddress: propertyParties.legalOwnerAddress,
        contactName: contacts.name,
      })
      .from(propertyParties)
      .leftJoin(contacts, eq(contacts.id, propertyParties.contactId))
      .where(
        and(
          eq(propertyParties.propertyId, propertyId),
          eq(propertyParties.userId, user.ownerUserId),
        ),
      ),
  ]);

  const accountById = new Map(accountRows.map((a) => [a.id, a.name] as const));
  const managementCompany =
    accountById.get(
      property.managementAccountId ?? property.accountId ?? "",
    ) ?? null;
  const ownerAccountName = property.ownerAccountId
    ? (accountById.get(property.ownerAccountId) ?? null)
    : null;
  // Legal owner name/address and NTO recipient live on the `nto_recipient`
  // party row, captured at the project pre-start checklist (separate from
  // the lead-side `owner` row, which only carries the owner-rep contact).
  const ntoParty =
    partyRows.find((p) => p.role === "nto_recipient" || p.isNtoRecipient) ??
    null;

  return {
    managementCompany,
    ownerName: ownerAccountName ?? ntoParty?.legalOwnerName ?? null,
    ownerAddress: ntoParty?.legalOwnerAddress ?? null,
    ntoRecipientName: ntoParty?.contactName ?? null,
  };
}

export async function getContactDetail(
  id: string,
): Promise<ContactDetail | null> {
  const user = await requireUser();
  const contactRows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.ownerUserId)))
    .limit(1);
  const contact = contactRows[0];
  if (!contact) return null;

  const [accountRows, propertyRows, leadRows] = await Promise.all([
    contact.accountId
      ? db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.id, contact.accountId),
              eq(accounts.userId, user.ownerUserId),
            ),
          )
          .limit(1)
      : Promise.resolve([] as Account[]),
    db
      .select({
        property: properties,
        role: propertyContacts.role,
      })
      .from(propertyContacts)
      .innerJoin(properties, eq(properties.id, propertyContacts.propertyId))
      .where(
        and(
          eq(propertyContacts.contactId, contact.id),
          eq(propertyContacts.userId, user.ownerUserId),
          eq(propertyContacts.active, true),
        ),
      )
      .orderBy(asc(properties.name), asc(properties.address)),
    db
      .select({
        id: leads.id,
        name: leads.name,
        status: leads.status,
        followUpAt: leads.followUpAt,
        lastContactedAt: leads.lastContactedAt,
        createdAt: leads.createdAt,
        propertyId: leads.propertyId,
      })
      .from(leads)
      .where(
        and(
          eq(leads.userId, user.ownerUserId),
          eq(leads.primaryContactId, contact.id),
        ),
      )
      .orderBy(desc(leads.createdAt)),
  ]);

  const latestLeadByPropertyId = new Map<
    string,
    { status: LeadStatus; followUpAt: string | null }
  >();
  for (const lead of leadRows) {
    if (!lead.propertyId) continue;
    if (latestLeadByPropertyId.has(lead.propertyId)) continue;
    latestLeadByPropertyId.set(lead.propertyId, {
      status: lead.status,
      followUpAt: lead.followUpAt,
    });
  }

  const propertySummaries: ContactPropertySummary[] = propertyRows.map(
    ({ property, role }) => {
      const latest = latestLeadByPropertyId.get(property.id);
      return {
        property,
        role,
        status: latest?.status ?? null,
        followUpAt: latest?.followUpAt ?? null,
      };
    },
  );

  return {
    contact,
    account: accountRows[0] ?? null,
    properties: propertySummaries,
    leads: leadRows.map(
      ({ id, name, status, followUpAt, lastContactedAt, createdAt }) => ({
        id,
        name,
        status,
        followUpAt,
        lastContactedAt,
        createdAt,
      }),
    ),
  };
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

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function rawRole(rawRow: Record<string, string> | null | undefined): string | null {
  if (!rawRow) return null;
  return (
    cleanText(rawRow["Role with Company"]) ??
    cleanText(rawRow.Role) ??
    cleanText(rawRow.Title)
  );
}

function compactObject(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

async function writeAuditLog(input: {
  userId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  previousValues?: unknown;
  newValues?: unknown;
  changedFields?: string[];
  source?: string;
}) {
  await db.insert(auditLog).values({
    userId: input.userId,
    actorUserId: input.actorUserId ?? input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    changedFields: input.changedFields ?? null,
    previousValues: input.previousValues ?? null,
    newValues: input.newValues ?? null,
    source: input.source ?? "app",
  });
}

async function createActivityEvent(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  leadId?: string | null;
  contactId?: string | null;
  propertyId?: string | null;
  accountId?: string | null;
  bidId?: string | null;
  metadata?: unknown;
  occurredAt?: Date;
}) {
  await db.insert(activityEvents).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    leadId: input.leadId ?? null,
    contactId: input.contactId ?? null,
    propertyId: input.propertyId ?? null,
    accountId: input.accountId ?? null,
    bidId: input.bidId ?? null,
    metadata: input.metadata ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  });
}

export async function searchAccounts(q: string, limit = 8): Promise<Pick<Account, "id" | "name">[]> {
  const user = await requireUser();
  const term = cleanText(q);
  if (!term) return [];
  const rows = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, user.ownerUserId),
        ilike(accounts.name, `%${term}%`),
      ),
    )
    .orderBy(asc(accounts.name))
    .limit(limit);
  return rows;
}

async function findOrCreateAccount(input: {
  userId: string;
  name: string | null | undefined;
  sourceTag?: string | null;
  /** Defaults to management_company — BAAA imports are management companies. */
  type?: AccountType;
}): Promise<Account | null> {
  const name = cleanText(input.name);
  if (!name) return null;

  const existing = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, input.userId),
        sql`lower(btrim(${accounts.name})) = lower(${name})`,
      ),
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(accounts)
    .values({
      userId: input.userId,
      name,
      sourceTag: input.sourceTag ?? null,
      ...(input.type ? { type: input.type } : {}),
    })
    .returning();
  await writeAuditLog({
    userId: input.userId,
    entityType: "account",
    entityId: inserted[0].id,
    action: "create",
    newValues: inserted[0],
  });
  return inserted[0];
}

async function findOrCreateContact(input: {
  userId: string;
  accountId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  sourceTag?: string | null;
}): Promise<Contact> {
  const name = cleanText(input.name) ?? "Unknown contact";
  const email = cleanText(input.email);
  const phone = cleanText(input.phone);

  const identityCondition = email
    ? sql`lower(btrim(${contacts.email})) = lower(${email})`
    : phone
      ? sql`btrim(${contacts.phone}) = ${phone}`
      : sql`lower(btrim(${contacts.name})) = lower(${name})`;

  const existing = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, input.userId), identityCondition))
    .limit(1);

  if (existing[0]) {
    const patch = compactObject({
      accountId: existing[0].accountId ?? input.accountId ?? null,
      email: existing[0].email ?? email,
      phone: existing[0].phone ?? phone,
      title: existing[0].title ?? cleanText(input.title),
      sourceTag: existing[0].sourceTag ?? input.sourceTag ?? null,
      updatedAt: new Date(),
    });
    const updated = await db
      .update(contacts)
      .set(patch)
      .where(eq(contacts.id, existing[0].id))
      .returning();
    return updated[0] ?? existing[0];
  }

  const inserted = await db
    .insert(contacts)
    .values({
      userId: input.userId,
      accountId: input.accountId ?? null,
      name,
      email,
      phone,
      title: cleanText(input.title),
      sourceTag: input.sourceTag ?? null,
    })
    .returning();
  await writeAuditLog({
    userId: input.userId,
    entityType: "contact",
    entityId: inserted[0].id,
    action: "create",
    newValues: inserted[0],
  });
  return inserted[0];
}

export async function createContact(data: {
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  accountId?: string | null;
  sourceTag?: string | null;
  notes?: string;
}): Promise<Contact> {
  const user = await requireUser();
  let account: Account | null = null;

  if (data.accountId) {
    const rows = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, data.accountId),
          eq(accounts.userId, user.ownerUserId),
        ),
      )
      .limit(1);
    account = rows[0] ?? null;
    if (!account) throw new Error("Account not found");
  } else {
    account = await findOrCreateAccount({
      userId: user.ownerUserId,
      name: data.company,
      sourceTag: data.sourceTag,
      type: "management_company",
    });
  }

  const contact = await findOrCreateContact({
    userId: user.ownerUserId,
    accountId: account?.id ?? null,
    name: data.name,
    email: data.email,
    phone: data.phone,
    title: data.title,
    sourceTag: data.sourceTag,
  });

  const notes = cleanText(data.notes);
  if (notes && contact.notes !== notes) {
    const updated = await db
      .update(contacts)
      .set({ notes, updatedAt: new Date() })
      .where(
        and(
          eq(contacts.id, contact.id),
          eq(contacts.userId, user.ownerUserId),
        ),
      )
      .returning();
    return updated[0] ?? contact;
  }

  return contact;
}

async function findOrCreateProperty(input: {
  userId: string;
  accountId?: string | null;
  managementAccountId?: string | null;
  ownerAccountId?: string | null;
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  satelliteImageUrl?: string | null;
  enrichmentStatus?: Lead["enrichmentStatus"];
  enrichmentError?: string | null;
  sourceTag?: string | null;
  rawSource?: Record<string, string> | null;
}): Promise<Property | null> {
  const address = cleanText(input.address);
  const name = cleanText(input.name);
  if (!address && !name) return null;

  const identityCondition = address
    ? sql`lower(btrim(${properties.address})) = lower(${address})`
    : sql`lower(btrim(${properties.name})) = lower(${name})`;

  const existing = await db
    .select()
    .from(properties)
    .where(and(eq(properties.userId, input.userId), identityCondition))
    .limit(1);

  if (existing[0]) {
    const patch = compactObject({
      accountId: existing[0].accountId ?? input.accountId ?? null,
      managementAccountId:
        existing[0].managementAccountId ??
        input.managementAccountId ??
        input.accountId ??
        null,
      ownerAccountId: existing[0].ownerAccountId ?? input.ownerAccountId ?? null,
      name: existing[0].name ?? name,
      address: existing[0].address ?? address,
      latitude: existing[0].latitude ?? input.latitude ?? null,
      longitude: existing[0].longitude ?? input.longitude ?? null,
      googlePlaceId: existing[0].googlePlaceId ?? input.googlePlaceId ?? null,
      satelliteImageUrl:
        existing[0].satelliteImageUrl ?? input.satelliteImageUrl ?? null,
      enrichmentStatus:
        input.enrichmentStatus ?? existing[0].enrichmentStatus ?? null,
      enrichmentError: input.enrichmentError ?? existing[0].enrichmentError ?? null,
      rawSource: existing[0].rawSource ?? input.rawSource ?? null,
      sourceTag: existing[0].sourceTag ?? input.sourceTag ?? null,
      updatedAt: new Date(),
    });
    const updated = await db
      .update(properties)
      .set(patch)
      .where(eq(properties.id, existing[0].id))
      .returning();
    return updated[0] ?? existing[0];
  }

  const inserted = await db
    .insert(properties)
    .values({
      userId: input.userId,
      accountId: input.accountId ?? null,
      managementAccountId:
        input.managementAccountId ?? input.accountId ?? null,
      ownerAccountId: input.ownerAccountId ?? null,
      name,
      address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      googlePlaceId: input.googlePlaceId ?? null,
      satelliteImageUrl: input.satelliteImageUrl ?? null,
      enrichmentStatus: input.enrichmentStatus ?? null,
      enrichmentError: input.enrichmentError ?? null,
      sourceTag: input.sourceTag ?? null,
      rawSource: input.rawSource ?? null,
    })
    .returning();
  await writeAuditLog({
    userId: input.userId,
    entityType: "property",
    entityId: inserted[0].id,
    action: "create",
    newValues: inserted[0],
  });
  return inserted[0];
}

async function upsertPropertyContact(input: {
  userId: string;
  propertyId: string | null | undefined;
  contactId: string;
  role?: string | null;
  sourceTag?: string | null;
  importRef?: Record<string, string> | null;
}): Promise<PropertyContact | null> {
  if (!input.propertyId) return null;
  const existing = await db
    .select()
    .from(propertyContacts)
    .where(
      and(
        eq(propertyContacts.userId, input.userId),
        eq(propertyContacts.propertyId, input.propertyId),
        eq(propertyContacts.contactId, input.contactId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const updated = await db
      .update(propertyContacts)
      .set({
        role: existing[0].role ?? cleanText(input.role),
        sourceTag: existing[0].sourceTag ?? input.sourceTag ?? null,
        importRef: existing[0].importRef ?? input.importRef ?? null,
        active: true,
        lastSeenAt: new Date(),
      })
      .where(eq(propertyContacts.id, existing[0].id))
      .returning();
    return updated[0] ?? existing[0];
  }

  const inserted = await db
    .insert(propertyContacts)
    .values({
      userId: input.userId,
      propertyId: input.propertyId,
      contactId: input.contactId,
      role: cleanText(input.role),
      sourceTag: input.sourceTag ?? null,
      importRef: input.importRef ?? null,
    })
    .returning();
  await writeAuditLog({
    userId: input.userId,
    entityType: "property_contact",
    entityId: inserted[0].id,
    action: "create",
    newValues: inserted[0],
  });
  return inserted[0];
}

async function createLeadContactLink(input: {
  userId: string;
  leadId: string;
  contactId: string;
  propertyContactId?: string | null;
  role?: string;
  isPrimary?: boolean;
}) {
  const existing = await db
    .select({ id: leadContacts.id })
    .from(leadContacts)
    .where(
      and(
        eq(leadContacts.userId, input.userId),
        eq(leadContacts.leadId, input.leadId),
        eq(leadContacts.contactId, input.contactId),
      ),
    )
    .limit(1);

  if (existing[0]) return;

  const inserted = await db
    .insert(leadContacts)
    .values({
      userId: input.userId,
      leadId: input.leadId,
      contactId: input.contactId,
      propertyContactId: input.propertyContactId ?? null,
      role: input.role ?? "primary",
      isPrimary: input.isPrimary ?? false,
    })
    .returning();
  await writeAuditLog({
    userId: input.userId,
    entityType: "lead_contact",
    entityId: inserted[0].id,
    action: "create",
    newValues: inserted[0],
  });
}

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
  const inserted: Lead[] = [];

  for (const r of rows) {
    const account = await findOrCreateAccount({
      userId: user.ownerUserId,
      name: r.company,
      sourceTag,
    });
    const property = await findOrCreateProperty({
      userId: user.ownerUserId,
      accountId: account?.id ?? null,
      name: r.propertyName,
      address: r.csvAddress,
      sourceTag,
      rawSource: r.rawRow,
      enrichmentStatus: "pending",
    });
    const contact = await findOrCreateContact({
      userId: user.ownerUserId,
      accountId: account?.id ?? null,
      name: r.name,
      email: r.email,
      phone: r.phone,
      title: rawRole(r.rawRow),
      sourceTag,
    });
    const propertyContact = await upsertPropertyContact({
      userId: user.ownerUserId,
      propertyId: property?.id ?? null,
      contactId: contact.id,
      role: rawRole(r.rawRow),
      sourceTag,
      importRef: r.rawRow,
    });
    const leadRows = await db
      .insert(leads)
      .values({
        userId: user.ownerUserId,
        accountId: account?.id ?? null,
        propertyId: property?.id ?? null,
        primaryContactId: contact.id,
        sourceTag,
        name: r.name,
        email: r.email,
        phone: r.phone,
        company: r.company,
        propertyName: r.propertyName,
        resolvedAddress: r.csvAddress,
        rawRow: r.rawRow,
        enrichmentStatus: "pending" as const,
      })
      .returning();
    const lead = leadRows[0];
    await createLeadContactLink({
      userId: user.ownerUserId,
      leadId: lead.id,
      contactId: contact.id,
      propertyContactId: propertyContact?.id ?? null,
      role: "primary",
      isPrimary: true,
    });
    await createActivityEvent({
      userId: user.ownerUserId,
      leadId: lead.id,
      contactId: contact.id,
      propertyId: property?.id ?? null,
      accountId: account?.id ?? null,
      type: "import",
      title: "Lead imported",
      body: "",
      metadata: { sourceTag, rawRow: r.rawRow },
      occurredAt: lead.createdAt,
    });
    await writeAuditLog({
      userId: user.ownerUserId,
      entityType: "lead",
      entityId: lead.id,
      action: "create",
      newValues: lead,
      source: "import",
    });
    inserted.push(lead);
  }

  return inserted;
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
  const previous = await getLead(id);
  const rows = await db
    .update(leads)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.userId, user.ownerUserId)))
    .returning();
  const lead = rows[0] ?? null;
  if (lead?.propertyId) {
    await db
      .update(properties)
      .set({
        address: patch.resolvedAddress ?? lead.resolvedAddress,
        latitude: patch.latitude ?? lead.latitude,
        longitude: patch.longitude ?? lead.longitude,
        googlePlaceId: patch.googlePlaceId ?? lead.googlePlaceId,
        satelliteImageUrl: patch.satelliteImageUrl ?? lead.satelliteImageUrl,
        enrichmentStatus: patch.enrichmentStatus ?? lead.enrichmentStatus,
        enrichmentError: patch.enrichmentError ?? lead.enrichmentError,
        updatedAt: new Date(),
      })
      .where(and(eq(properties.id, lead.propertyId), eq(properties.userId, user.ownerUserId)));
  }
  if (lead) {
    await writeAuditLog({
      userId: user.ownerUserId,
      entityType: "lead",
      entityId: lead.id,
      action: "update",
      previousValues: previous,
      newValues: lead,
      changedFields: Object.keys(patch),
      source: "enrichment",
    });
  }
  return rows[0] ?? null;
}

export async function updateLead(
  id: string,
  patch: Partial<
    Pick<
      Lead,
      | "name"
      | "email"
      | "phone"
      | "company"
      | "propertyName"
      | "resolvedAddress"
      | "notes"
    >
  >,
) {
  const user = await requireUser();
  const previous = await getLead(id);
  if (!previous) return null;
  const account = await findOrCreateAccount({
    userId: user.ownerUserId,
    name: patch.company ?? previous.company,
    sourceTag: previous.sourceTag,
  });
  const property = await findOrCreateProperty({
    userId: user.ownerUserId,
    accountId: account?.id ?? previous.accountId ?? null,
    name: patch.propertyName ?? previous.propertyName,
    address: patch.resolvedAddress ?? previous.resolvedAddress,
    latitude: previous.latitude,
    longitude: previous.longitude,
    googlePlaceId: previous.googlePlaceId,
    satelliteImageUrl: previous.satelliteImageUrl,
    enrichmentStatus: previous.enrichmentStatus,
    enrichmentError: previous.enrichmentError,
    sourceTag: previous.sourceTag,
    rawSource: previous.rawRow,
  });
  const contact = await findOrCreateContact({
    userId: user.ownerUserId,
    accountId: account?.id ?? previous.accountId ?? null,
    name: patch.name ?? previous.name,
    email: patch.email ?? previous.email,
    phone: patch.phone ?? previous.phone,
    title: rawRole(previous.rawRow),
    sourceTag: previous.sourceTag,
  });
  const propertyContact = await upsertPropertyContact({
    userId: user.ownerUserId,
    propertyId: property?.id ?? previous.propertyId,
    contactId: contact.id,
    role: rawRole(previous.rawRow),
    sourceTag: previous.sourceTag,
    importRef: previous.rawRow,
  });
  const rows = await db
    .update(leads)
    .set({
      ...patch,
      accountId: account?.id ?? previous.accountId,
      propertyId: property?.id ?? previous.propertyId,
      primaryContactId: contact.id,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, id), eq(leads.userId, user.ownerUserId)))
    .returning();
  const lead = rows[0] ?? null;
  if (lead) {
    await createLeadContactLink({
      userId: user.ownerUserId,
      leadId: lead.id,
      contactId: contact.id,
      propertyContactId: propertyContact?.id ?? null,
      role: "primary",
      isPrimary: true,
    });
    await writeAuditLog({
      userId: user.ownerUserId,
      entityType: "lead",
      entityId: lead.id,
      action: "update",
      previousValues: previous,
      newValues: lead,
      changedFields: Object.keys(patch),
    });
  }
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
    .where(and(eq(leads.id, id), eq(leads.userId, user.ownerUserId)))
    .returning();
  const lead = rows[0] ?? null;
  if (lead) {
    await createActivityEvent({
      userId: user.ownerUserId,
      leadId: lead.id,
      contactId: lead.primaryContactId,
      propertyId: lead.propertyId,
      accountId: lead.accountId,
      type: "call",
      title: "Contact attempt logged",
    });
    await writeAuditLog({
      userId: user.ownerUserId,
      entityType: "lead",
      entityId: lead.id,
      action: "update",
      changedFields: ["last_contacted_at", "contact_attempts"],
      newValues: {
        lastContactedAt: lead.lastContactedAt,
        contactAttempts: lead.contactAttempts,
      },
    });
  }
  return rows[0] ?? null;
}

export async function setLeadFollowUp(id: string, followUpAt: string | null) {
  const user = await requireUser();
  const previous = await getLead(id);
  const rows = await db
    .update(leads)
    .set({ followUpAt, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.userId, user.ownerUserId)))
    .returning();
  const lead = rows[0] ?? null;
  if (lead) {
    await createActivityEvent({
      userId: user.ownerUserId,
      leadId: lead.id,
      contactId: lead.primaryContactId,
      propertyId: lead.propertyId,
      accountId: lead.accountId,
      type: "task",
      title: followUpAt ? "Follow-up scheduled" : "Follow-up cleared",
      metadata: { followUpAt },
    });
    await writeAuditLog({
      userId: user.ownerUserId,
      entityType: "lead",
      entityId: lead.id,
      action: "update",
      previousValues: { followUpAt: previous?.followUpAt ?? null },
      newValues: { followUpAt: lead.followUpAt },
      changedFields: ["follow_up_at"],
    });
  }
  return rows[0] ?? null;
}

export async function updateLeadStatus(id: string, status: Lead["status"]) {
  const user = await requireUser();
  const previous = await getLead(id);
  const rows = await db
    .update(leads)
    .set({
      status,
      closedAt: status === "won" || status === "lost" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, id), eq(leads.userId, user.ownerUserId)))
    .returning();
  const lead = rows[0] ?? null;
  if (lead) {
    await createActivityEvent({
      userId: user.ownerUserId,
      leadId: lead.id,
      contactId: lead.primaryContactId,
      propertyId: lead.propertyId,
      accountId: lead.accountId,
      type: "status_change",
      title: "Lead status changed",
      metadata: { from: previous?.status ?? null, to: status },
    });
    await writeAuditLog({
      userId: user.ownerUserId,
      entityType: "lead",
      entityId: lead.id,
      action: "update",
      previousValues: { status: previous?.status ?? null },
      newValues: { status: lead.status, closedAt: lead.closedAt },
      changedFields: ["status", "closed_at"],
    });
  }
  return rows[0] ?? null;
}

/** Distinct source_tag values for the current user (for filter dropdown). */
export async function getLeadSourceTags(): Promise<string[]> {
  const user = await requireUser();
  const rows = await db
    .selectDistinct({ sourceTag: leads.sourceTag })
    .from(leads)
    .where(eq(leads.userId, user.ownerUserId));
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
        WHERE b.user_id = ${user.ownerUserId}
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
        WHERE b.user_id = ${user.ownerUserId}
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
  const id = userId ?? (await requireUser()).ownerUserId;
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
      .values({ userId: user.ownerUserId, websiteSubmittedAt: now })
      .onConflictDoUpdate({
        target: onboardings.userId,
        set: { websiteSubmittedAt: now },
      });

    await tx
      .insert(companyProfiles)
      .values({
        userId: user.ownerUserId,
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
    .values({ userId: user.ownerUserId, profileConfirmedAt: now })
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
      userId: user.ownerUserId,
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
    .values({ userId: user.ownerUserId, skipped: true, completedAt: now })
    .onConflictDoUpdate({
      target: onboardings.userId,
      set: { skipped: true, completedAt: now },
    });
}

// ── Company Profile ──

export async function getCompanyProfile(userId?: string) {
  const id = userId ?? (await requireUser()).ownerUserId;
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
    .values({ userId: user.ownerUserId, ...data, updatedAt: now })
    .onConflictDoUpdate({
      target: companyProfiles.userId,
      set: { ...data, updatedAt: now },
    })
    .returning();
  return rows[0];
}

// ── Org members ──

export type OrgMember = typeof orgMemberships.$inferSelect;

export async function listOrgMembers() {
  const user = await requireUser();
  return db
    .select()
    .from(orgMemberships)
    .where(eq(orgMemberships.ownerUserId, user.ownerUserId))
    .orderBy(asc(orgMemberships.createdAt));
}

export async function inviteOrgMember(input: { email: string; role: "admin" | "member" }) {
  const user = await requireUser();
  if (user.role !== "owner" && user.role !== "admin") {
    throw new Error("Only owners and admins can invite members");
  }
  const email = input.email.trim();
  if (!email) throw new Error("Email is required");
  const now = new Date();

  const inserted = await db
    .insert(orgMemberships)
    .values({
      ownerUserId: user.ownerUserId,
      email,
      role: input.role,
      status: "invited",
      invitedAt: now,
      invitedByUserId: user.userId,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  return inserted[0] ?? null;
}

export async function removeOrgMember(membershipId: string) {
  const user = await requireUser();
  if (user.role !== "owner" && user.role !== "admin") {
    throw new Error("Only owners and admins can remove members");
  }
  await db
    .delete(orgMemberships)
    .where(
      and(
        eq(orgMemberships.id, membershipId),
        eq(orgMemberships.ownerUserId, user.ownerUserId),
      ),
    );
}

// ── AI context (Ask tab) ───────────────────────────────────────────────────
//
// "Units" the user can tag into an Ask conversation, plus the compact,
// org-scoped context packs the model (or the offline mock) reasons over. The
// bid pack covers the project/delivery facet too (the bid row IS the project).

export const AI_UNIT_TYPES = [
  "lead",
  "bid",
  "property",
  "contact",
  "account",
] as const;
export type AiUnitType = (typeof AI_UNIT_TYPES)[number];

export type UnitRef = { type: AiUnitType; id: string };

export type UnitHit = {
  type: AiUnitType;
  id: string;
  label: string;
  sublabel: string | null;
};

export type ContextPack = {
  type: AiUnitType;
  id: string;
  label: string;
  found: boolean;
  /** Compact markdown summary — fed to the model and shown in the UI. */
  markdown: string;
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Type-ahead search across the taggable units for the Ask composer. Returns a
 * bounded, org-scoped set of hits across leads, bids, properties, contacts,
 * and accounts.
 */
export async function searchUnits(q: string, perType = 4): Promise<UnitHit[]> {
  const user = await requireUser();
  const trimmed = q.trim();
  if (!trimmed) return [];
  const needle = `%${escapeIlike(trimmed)}%`;

  const [leadRows, bidRows, propertyRows, contactRows, accountRows] =
    await Promise.all([
      db
        .select({
          id: leads.id,
          name: leads.name,
          propertyName: leads.propertyName,
          company: leads.company,
          status: leads.status,
        })
        .from(leads)
        .where(
          and(
            eq(leads.userId, user.ownerUserId),
            or(
              ilike(leads.name, needle),
              ilike(leads.company, needle),
              ilike(leads.propertyName, needle),
            ),
          ),
        )
        .orderBy(desc(leads.updatedAt))
        .limit(perType),
      db
        .select({
          id: bids.id,
          propertyName: bids.propertyName,
          clientName: bids.clientName,
          status: bids.status,
          deliveryStatus: bids.deliveryStatus,
        })
        .from(bids)
        .where(
          and(
            eq(bids.userId, user.ownerUserId),
            or(
              ilike(bids.propertyName, needle),
              ilike(bids.clientName, needle),
              ilike(bids.address, needle),
            ),
          ),
        )
        .orderBy(desc(bids.updatedAt))
        .limit(perType),
      db
        .select({
          id: properties.id,
          name: properties.name,
          address: properties.address,
        })
        .from(properties)
        .where(
          and(
            eq(properties.userId, user.ownerUserId),
            or(
              ilike(properties.name, needle),
              ilike(properties.address, needle),
            ),
          ),
        )
        .orderBy(desc(properties.updatedAt))
        .limit(perType),
      db
        .select({
          id: contacts.id,
          name: contacts.name,
          title: contacts.title,
        })
        .from(contacts)
        .where(
          and(eq(contacts.userId, user.ownerUserId), ilike(contacts.name, needle)),
        )
        .orderBy(desc(contacts.updatedAt))
        .limit(perType),
      db
        .select({ id: accounts.id, name: accounts.name, type: accounts.type })
        .from(accounts)
        .where(
          and(eq(accounts.userId, user.ownerUserId), ilike(accounts.name, needle)),
        )
        .orderBy(desc(accounts.updatedAt))
        .limit(perType),
    ]);

  const hits: UnitHit[] = [];
  for (const l of leadRows) {
    hits.push({
      type: "lead",
      id: l.id,
      label: l.propertyName?.trim() || l.name,
      sublabel: `Lead · ${l.status}`,
    });
  }
  for (const b of bidRows) {
    hits.push({
      type: "bid",
      id: b.id,
      label: b.propertyName?.trim() || b.clientName,
      sublabel: b.deliveryStatus
        ? `Project · ${b.deliveryStatus.replace(/_/g, " ")}`
        : `Bid · ${b.status}`,
    });
  }
  for (const p of propertyRows) {
    hits.push({
      type: "property",
      id: p.id,
      label: p.name?.trim() || p.address || "Property",
      sublabel: p.name ? p.address : "Property",
    });
  }
  for (const c of contactRows) {
    hits.push({
      type: "contact",
      id: c.id,
      label: c.name,
      sublabel: c.title || "Contact",
    });
  }
  for (const a of accountRows) {
    hits.push({
      type: "account",
      id: a.id,
      label: a.name,
      sublabel: `Company · ${a.type.replace(/_/g, " ")}`,
    });
  }
  return hits;
}

async function buildBidPack(id: string): Promise<ContextPack> {
  const data = await getBidPageData(id);
  if (!data) {
    return { type: "bid", id, label: "Unknown bid", found: false, markdown: "" };
  }
  const { bid, buildings: bldgs, lineItems: lis, accessItems: ais, totalSqft } =
    data;
  const isProject = bid.deliveryStatus != null;
  const label = bid.propertyName?.trim() || bid.clientName;

  const pricing = calculateBidPricing({
    totalSqft,
    coverageSqftPerGallon: numOrNull(bid.coverageSqftPerGallon),
    pricePerGallon: numOrNull(bid.pricePerGallon),
    laborRatePerUnit: numOrNull(bid.laborRatePerUnit),
    marginPercent: numOrNull(bid.marginPercent),
    lineItems: lis.map((li) => ({
      name: li.name,
      amount: numOrNull(li.amount) ?? 0,
    })),
    accessItems: ais.map((a) => ({
      name: a.type,
      amount: numOrNull(a.amount) ?? 0,
    })),
  });

  // Accepted amount, if a proposal snapshot captured one.
  const snap = data.proposals[0]?.snapshot as
    | { pricing?: { grandTotal?: number }; grandTotal?: number }
    | undefined;
  const acceptedTotal = snap?.pricing?.grandTotal ?? snap?.grandTotal ?? null;

  const lines = [
    `${isProject ? "Project" : "Bid"}: ${label}${bid.address ? ` — ${bid.address}` : ""}`,
    `Client: ${bid.clientName}`,
    `Stage: ${(isProject ? bid.deliveryStatus! : bid.status).replace(/_/g, " ")}`,
    `Estimated total: ${fmtMoney(pricing.grandTotal)}${pricing.complete ? "" : " (pricing incomplete)"}`,
    `Buildings: ${bldgs.length} (${Math.round(totalSqft).toLocaleString("en-US")} sqft paintable)`,
  ];
  if (data.proposals.length > 0) {
    lines.push(
      `Proposal: ${data.proposals.length} generated${acceptedTotal != null ? `; snapshot total ${fmtMoney(acceptedTotal)}` : ""}`,
    );
  }
  if (bid.acceptedByName || bid.acceptedAt) {
    lines.push(
      `Accepted${bid.acceptedByName ? ` by ${bid.acceptedByName}` : ""}${bid.acceptedAt ? ` on ${bid.acceptedAt.toISOString().slice(0, 10)}` : ""}`,
    );
  }
  if (isProject) {
    if (bid.targetStartDate || bid.targetEndDate) {
      lines.push(
        `Target dates: ${bid.targetStartDate ?? "?"} → ${bid.targetEndDate ?? "?"}`,
      );
    }
    if (bid.crewLeadName || bid.assignedSub) {
      lines.push(
        `Crew: ${[bid.crewLeadName, bid.assignedSub].filter(Boolean).join(" / ")}`,
      );
    }
  }
  return { type: "bid", id, label, found: true, markdown: lines.join("\n") };
}

async function buildLeadPack(id: string): Promise<ContextPack> {
  const lead = await getLead(id);
  if (!lead) {
    return {
      type: "lead",
      id,
      label: "Unknown lead",
      found: false,
      markdown: "",
    };
  }
  const label = lead.propertyName?.trim() || lead.name;
  const lines = [
    `Lead: ${label}`,
    `Contact: ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
    `Status: ${lead.status}`,
    `Follow-up: ${lead.followUpAt ?? "none"}`,
    `Contact attempts: ${lead.contactAttempts}${lead.lastContactedAt ? `, last ${lead.lastContactedAt.toISOString().slice(0, 10)}` : ""}`,
  ];
  if (lead.notes?.trim()) lines.push(`Notes: ${lead.notes.trim().slice(0, 240)}`);
  return { type: "lead", id, label, found: true, markdown: lines.join("\n") };
}

async function buildPropertyPack(id: string): Promise<ContextPack> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.userId, user.ownerUserId)))
    .limit(1);
  const property = rows[0];
  if (!property) {
    return {
      type: "property",
      id,
      label: "Unknown property",
      found: false,
      markdown: "",
    };
  }
  const [bidCount, leadCount] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(bids)
      .where(and(eq(bids.userId, user.ownerUserId), eq(bids.propertyId, id))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(eq(leads.userId, user.ownerUserId), eq(leads.propertyId, id))),
  ]);
  const label = property.name?.trim() || property.address || "Property";
  const lines = [
    `Property: ${label}`,
    property.address ? `Address: ${property.address}` : null,
    `Bids/projects: ${bidCount[0]?.n ?? 0}`,
    `Leads: ${leadCount[0]?.n ?? 0}`,
  ].filter(Boolean) as string[];
  return { type: "property", id, label, found: true, markdown: lines.join("\n") };
}

async function buildContactPack(id: string): Promise<ContextPack> {
  const user = await requireUser();
  const rows = await db
    .select({
      contact: contacts,
      accountName: accounts.name,
    })
    .from(contacts)
    .leftJoin(accounts, eq(contacts.accountId, accounts.id))
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.ownerUserId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      type: "contact",
      id,
      label: "Unknown contact",
      found: false,
      markdown: "",
    };
  }
  const c = row.contact;
  const lines = [
    `Contact: ${c.name}${c.title ? ` — ${c.title}` : ""}`,
    row.accountName ? `Company: ${row.accountName}` : null,
    c.email ? `Email: ${c.email}` : null,
    c.phone ? `Phone: ${c.phone}` : null,
  ].filter(Boolean) as string[];
  return { type: "contact", id, label: c.name, found: true, markdown: lines.join("\n") };
}

async function buildAccountPack(id: string): Promise<ContextPack> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.ownerUserId)))
    .limit(1);
  const account = rows[0];
  if (!account) {
    return {
      type: "account",
      id,
      label: "Unknown company",
      found: false,
      markdown: "",
    };
  }
  const [propCount, leadCount] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(properties)
      .where(
        and(
          eq(properties.userId, user.ownerUserId),
          or(
            eq(properties.managementAccountId, id),
            eq(properties.ownerAccountId, id),
            eq(properties.accountId, id),
          ),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(eq(leads.userId, user.ownerUserId), eq(leads.accountId, id))),
  ]);
  const lines = [
    `Company: ${account.name} (${account.type.replace(/_/g, " ")})`,
    `Properties: ${propCount[0]?.n ?? 0}`,
    `Leads: ${leadCount[0]?.n ?? 0}`,
  ];
  return {
    type: "account",
    id,
    label: account.name,
    found: true,
    markdown: lines.join("\n"),
  };
}

// ── Money layer (AQP reconciliation, Phase 1) ──────────────────────────────
//
// Expenses hang off the bid spine (the bid IS the project, Model A). Job
// financial state is always DERIVED from dated expense rows + the immutable
// contract_value snapshot — never stored (AQP principle #5).

export type Expense = typeof expenses.$inferSelect;

export async function getExpensesForBid(bidId: string): Promise<Expense[]> {
  await requireBidOwnership(bidId);
  return db
    .select()
    .from(expenses)
    .where(eq(expenses.bidId, bidId))
    .orderBy(desc(expenses.date), desc(expenses.createdAt));
}

export async function createExpense(data: {
  bidId: string;
  date: string;
  category: ExpenseCategory;
  paymentType?: PaymentType | null;
  vendor?: string | null;
  description?: string | null;
  amount: number;
  tax?: number | null;
  invoiceNumber?: string | null;
}): Promise<Expense> {
  const user = await requireUser();
  await requireBidOwnership(data.bidId, user.ownerUserId);
  const rows = await db
    .insert(expenses)
    .values({
      userId: user.ownerUserId,
      bidId: data.bidId,
      date: data.date,
      category: data.category,
      paymentType: data.paymentType ?? null,
      vendor: data.vendor ?? null,
      description: (data.description ?? "").trim(),
      amount: String(data.amount),
      tax: String(data.tax ?? 0),
      invoiceNumber: data.invoiceNumber ?? null,
      enteredBy: user.userId,
    })
    .returning();
  return rows[0];
}

export async function deleteExpense(id: string): Promise<void> {
  const user = await requireUser();
  await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.ownerUserId)));
}

export type CategorySpend = { category: ExpenseCategory; spent: number };

export type JobFinancials = {
  contractValue: number | null;
  /** Sum of approved change orders (signed). */
  changeOrdersTotal: number;
  /** contractValue + changeOrdersTotal; null without a contract value. */
  adjustedContract: number | null;
  spent: number;
  /** adjustedContract − spent. Null until a contract value. */
  remaining: number | null;
  /** Same as remaining here (gross profit-of-spent). */
  profit: number | null;
  /** 0–1 fraction of the adjusted contract spent; null without one. */
  pctSpent: number | null;
  /** Billed: invoices in invoiced/paid/overdue. */
  invoicedTotal: number;
  paidTotal: number;
  /** invoicedTotal − paidTotal. */
  outstanding: number;
  byCategory: CategorySpend[];
  expenseCount: number;
};

/**
 * Derive a job's financial state from the contract baseline + approved change
 * orders + dated expenses + invoices. Nothing here is stored — it's computed
 * live on every read (AQP principle #5).
 */
export async function getJobFinancials(bidId: string): Promise<JobFinancials> {
  await requireBidOwnership(bidId);

  const [bidRows, totalRows, catRows, coRows, invRows] = await Promise.all([
    db
      .select({ contractValue: bids.contractValue })
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1),
    db
      .select({
        spent: sql<number>`coalesce(sum(${expenses.amount}::numeric + ${expenses.tax}::numeric), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(expenses)
      .where(eq(expenses.bidId, bidId)),
    db
      .select({
        category: expenses.category,
        spent: sql<number>`coalesce(sum(${expenses.amount}::numeric + ${expenses.tax}::numeric), 0)`,
      })
      .from(expenses)
      .where(eq(expenses.bidId, bidId))
      .groupBy(expenses.category)
      .orderBy(
        sql`coalesce(sum(${expenses.amount}::numeric + ${expenses.tax}::numeric), 0) desc`,
      ),
    db
      .select({
        approved: sql<number>`coalesce(sum(${changeOrders.amount}::numeric) filter (where ${changeOrders.status} = 'approved'), 0)`,
      })
      .from(changeOrders)
      .where(eq(changeOrders.bidId, bidId)),
    db
      .select({
        invoiced: sql<number>`coalesce(sum(${invoices.amount}::numeric) filter (where ${invoices.status} in ('invoiced','paid','overdue')), 0)`,
        paid: sql<number>`coalesce(sum(${invoices.amount}::numeric) filter (where ${invoices.status} = 'paid'), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.bidId, bidId)),
  ]);

  const contractValue =
    bidRows[0]?.contractValue != null ? Number(bidRows[0].contractValue) : null;
  const changeOrdersTotal = Number(coRows[0]?.approved ?? 0);
  const adjustedContract =
    contractValue == null ? null : contractValue + changeOrdersTotal;
  const spent = Number(totalRows[0]?.spent ?? 0);
  const remaining = adjustedContract == null ? null : adjustedContract - spent;
  const profit = remaining;
  const pctSpent =
    adjustedContract == null || adjustedContract === 0
      ? null
      : spent / adjustedContract;
  const invoicedTotal = Number(invRows[0]?.invoiced ?? 0);
  const paidTotal = Number(invRows[0]?.paid ?? 0);

  return {
    contractValue,
    changeOrdersTotal,
    adjustedContract,
    spent,
    remaining,
    profit,
    pctSpent,
    invoicedTotal,
    paidTotal,
    outstanding: invoicedTotal - paidTotal,
    byCategory: catRows.map((r) => ({
      category: r.category as ExpenseCategory,
      spent: Number(r.spent),
    })),
    expenseCount: Number(totalRows[0]?.count ?? 0),
  };
}

// ── Invoices + change orders (Phase 1b) ──

export type Invoice = typeof invoices.$inferSelect;
export type ChangeOrder = typeof changeOrders.$inferSelect;

export async function getInvoicesForBid(bidId: string): Promise<Invoice[]> {
  await requireBidOwnership(bidId);
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.bidId, bidId))
    .orderBy(asc(invoices.sequence), asc(invoices.createdAt));
}

export async function createInvoice(data: {
  bidId: string;
  type: InvoiceType;
  amount: number;
  sequence?: number | null;
  trigger?: string | null;
  dueAt?: string | null;
}): Promise<Invoice> {
  const user = await requireUser();
  await requireBidOwnership(data.bidId, user.ownerUserId);
  const rows = await db
    .insert(invoices)
    .values({
      userId: user.ownerUserId,
      bidId: data.bidId,
      type: data.type,
      amount: String(data.amount),
      sequence: data.sequence ?? null,
      trigger: data.trigger ?? null,
      dueAt: data.dueAt ?? null,
    })
    .returning();
  return rows[0];
}

export async function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<void> {
  const user = await requireUser();
  await db
    .update(invoices)
    .set({
      status,
      paidAt: status === "paid" ? new Date().toISOString().slice(0, 10) : null,
      invoicedAt:
        status === "pending" || status === "cancelled"
          ? sql`${invoices.invoicedAt}`
          : sql`coalesce(${invoices.invoicedAt}, current_date)`,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.ownerUserId)));
}

export async function deleteInvoice(id: string): Promise<void> {
  const user = await requireUser();
  await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.ownerUserId)));
}

export async function getChangeOrdersForBid(
  bidId: string,
): Promise<ChangeOrder[]> {
  await requireBidOwnership(bidId);
  return db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.bidId, bidId))
    .orderBy(desc(changeOrders.createdAt));
}

export async function createChangeOrder(data: {
  bidId: string;
  description: string;
  amount: number;
  reason?: ChangeOrderReason | null;
  detail?: string | null;
}): Promise<ChangeOrder> {
  const user = await requireUser();
  await requireBidOwnership(data.bidId, user.ownerUserId);
  const rows = await db
    .insert(changeOrders)
    .values({
      userId: user.ownerUserId,
      bidId: data.bidId,
      description: data.description.trim(),
      detail: (data.detail ?? "").trim(),
      reason: data.reason ?? null,
      amount: String(data.amount),
      createdBy: user.userId,
    })
    .returning();
  return rows[0];
}

export async function setChangeOrderStatus(
  id: string,
  status: ChangeOrderStatus,
  approvedBy?: string | null,
): Promise<void> {
  const user = await requireUser();
  await db
    .update(changeOrders)
    .set({
      status,
      approvedBy: status === "approved" ? (approvedBy ?? null) : null,
      approvedAt: status === "approved" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(changeOrders.id, id), eq(changeOrders.userId, user.ownerUserId)),
    );
}

export async function deleteChangeOrder(id: string): Promise<void> {
  const user = await requireUser();
  await db
    .delete(changeOrders)
    .where(
      and(eq(changeOrders.id, id), eq(changeOrders.userId, user.ownerUserId)),
    );
}

/** Resolve tagged unit refs into compact, org-scoped context packs. */
export async function buildContextPacks(
  refs: UnitRef[],
): Promise<ContextPack[]> {
  const unique = refs.filter(
    (r, i) =>
      refs.findIndex((o) => o.type === r.type && o.id === r.id) === i,
  );
  return Promise.all(
    unique.map((ref) => {
      switch (ref.type) {
        case "bid":
          return buildBidPack(ref.id);
        case "lead":
          return buildLeadPack(ref.id);
        case "property":
          return buildPropertyPack(ref.id);
        case "contact":
          return buildContactPack(ref.id);
        case "account":
          return buildAccountPack(ref.id);
      }
    }),
  );
}
