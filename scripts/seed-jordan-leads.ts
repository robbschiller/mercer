/**
 * Seed a curated trade-show attendee list onto a specific user's account.
 * For demo prep (Phase F per docs/plan.md) — Jordan's account gets a clean
 * sample import without needing to upload through the UI. Inserts directly
 * via Drizzle so auth/session is bypassed.
 *
 * Usage:
 *   bun run scripts/seed-jordan-leads.ts --user-id=<uuid> [--csv=<path>] [--source=<tag>]
 *
 * Enrichment is NOT run here. The leads land with enrichment_status=null so
 * the user (or a manual run) can trigger it afterward. Keeps seeds idempotent
 * and independent of Google Places / API keys.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import { leads } from "../src/db/schema";
import { parseCsv, autoMapColumns, mapRowsToLeads } from "../src/lib/leads/csv";

const root = resolve(import.meta.dirname, "..");
config({ path: join(root, ".env"), quiet: true });
config({ path: join(root, ".env.local"), override: true, quiet: true });

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const userId = arg("user-id") ?? process.env.SEED_USER_ID;
if (!userId) {
  console.error(
    "Missing --user-id=<uuid>. Find Jordan's id in Supabase → Auth → Users."
  );
  process.exit(1);
}
if (!/^[0-9a-f-]{36}$/i.test(userId)) {
  console.error(`Not a valid UUID: ${userId}`);
  process.exit(1);
}

const csvPath = arg("csv") ?? join(root, "scripts/fixtures/jordan-demo.csv");
const sourceTag = arg("source") ?? "Demo — BAAA 2026 sample";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local and retry.");
  process.exit(1);
}

const text = readFileSync(csvPath, "utf8");
const { headers, rows } = parseCsv(text);
if (headers.length === 0 || rows.length === 0) {
  console.error(`CSV empty or malformed: ${csvPath}`);
  process.exit(1);
}
const mapping = autoMapColumns(headers);
if (!mapping.name) {
  console.error(
    `No name column detected. Headers seen: ${headers.join(", ")}`
  );
  process.exit(1);
}
const importRows = mapRowsToLeads(rows, mapping);
if (importRows.length === 0) {
  console.error("No rows with a name value — nothing to insert.");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

try {
  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.sourceTag, sourceTag)))
    .limit(1);
  if (existing.length > 0) {
    console.log(
      `Source tag "${sourceTag}" already has leads for this user. ` +
        `Delete them first or pass --source=<different tag> to re-seed.`
    );
    process.exit(0);
  }

  const inserted = await db
    .insert(leads)
    .values(
      importRows.map((r) => ({
        userId,
        sourceTag,
        name: r.name,
        email: r.email,
        phone: r.phone,
        company: r.company,
        propertyName: r.propertyName,
        rawRow: r.rawRow,
      }))
    )
    .returning({ id: leads.id });

  console.log(
    `Seeded ${inserted.length} leads for user ${userId} under source "${sourceTag}".`
  );
  console.log("Enrichment has NOT been run — trigger it via the UI if needed.");
} finally {
  await client.end();
}
