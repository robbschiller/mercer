import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

export type Project = typeof projects.$inferSelect;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function getProjects() {
  const user = await requireUser();
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.updatedAt));
}

export async function getProject(id: string) {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createProject(
  data: Pick<Project, "address" | "clientName" | "notes">
) {
  const user = await requireUser();
  const rows = await db
    .insert(projects)
    .values({ ...data, userId: user.id })
    .returning();
  return rows[0];
}

export async function updateProject(
  id: string,
  data: Partial<Pick<Project, "address" | "clientName" | "notes" | "status">>
) {
  const user = await requireUser();
  const rows = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteProject(id: string) {
  const user = await requireUser();
  await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  return true;
}
