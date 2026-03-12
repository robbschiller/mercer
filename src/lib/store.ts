import { db } from "@/db";
import { bids } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

export type Bid = typeof bids.$inferSelect;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

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
  data: Pick<Bid, "address" | "clientName" | "notes">
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
  data: Partial<Pick<Bid, "address" | "clientName" | "notes" | "status">>
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
