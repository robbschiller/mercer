import { db } from "@/db";
import { bids, buildings, surfaces, lineItems, userDefaults, proposals } from "@/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { computeTotalSqft } from "@/lib/dimensions";

export type Bid = typeof bids.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Surface = typeof surfaces.$inferSelect;
export type LineItem = typeof lineItems.$inferSelect;
export type UserDefault = typeof userDefaults.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type BuildingWithSqft = Building & { totalSqft: number };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  data: Pick<Bid, "propertyName" | "address" | "clientName" | "notes">
) {
  const user = await requireUser();
  const rows = await db
    .insert(bids)
    .values({ ...data, userId: user.id })
    .returning();
  return rows[0];
}

export async function updateBid(
  id: string,
  data: Partial<Pick<Bid, "propertyName" | "address" | "clientName" | "notes" | "status">>
) {
  const user = await requireUser();
  const rows = await db
    .update(bids)
    .set({ ...data, updatedAt: new Date() })
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

  const [bidRows, buildingRows, surfaceRows, lineItemRows, sqftRows, proposalRows] =
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
