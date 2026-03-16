import { db } from "@/db";
import { bids, buildings, surfaces } from "@/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { computeTotalSqft } from "@/lib/dimensions";

export type Bid = typeof bids.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Surface = typeof surfaces.$inferSelect;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function requireBidOwnership(bidId: string) {
  const user = await requireUser();
  const rows = await db
    .select({ id: bids.id })
    .from(bids)
    .where(and(eq(bids.id, bidId), eq(bids.userId, user.id)))
    .limit(1);
  if (!rows[0]) throw new Error("Bid not found");
  return user;
}

async function requireBuildingOwnership(buildingId: string) {
  const user = await requireUser();
  const rows = await db
    .select({ id: buildings.id, bidId: buildings.bidId })
    .from(buildings)
    .innerJoin(bids, eq(buildings.bidId, bids.id))
    .where(and(eq(buildings.id, buildingId), eq(bids.userId, user.id)))
    .limit(1);
  if (!rows[0]) throw new Error("Building not found");
  return { user, bidId: rows[0].bidId };
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
  const rows = await db
    .select({
      surface: surfaces,
      bidId: buildings.bidId,
    })
    .from(surfaces)
    .innerJoin(buildings, eq(surfaces.buildingId, buildings.id))
    .innerJoin(bids, eq(buildings.bidId, bids.id))
    .where(eq(surfaces.id, id))
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
  const rows = await db
    .select({ bidId: buildings.bidId })
    .from(surfaces)
    .innerJoin(buildings, eq(surfaces.buildingId, buildings.id))
    .where(eq(surfaces.id, id))
    .limit(1);

  if (!rows[0]) throw new Error("Surface not found");

  await db.delete(surfaces).where(eq(surfaces.id, id));

  await db
    .update(bids)
    .set({ updatedAt: new Date() })
    .where(eq(bids.id, rows[0].bidId));

  return true;
}
