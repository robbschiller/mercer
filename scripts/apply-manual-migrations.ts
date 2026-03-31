/**
 * Applies drizzle/manual/*.sql in order when drizzle-kit push fails on Supabase.
 * Loads DATABASE_URL from .env then .env.local (same as drizzle.config.ts).
 */
import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";

const root = resolve(import.meta.dirname, "..");
config({ path: join(root, ".env"), quiet: true });
config({ path: join(root, ".env.local"), override: true, quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local and run again."
  );
}

const manualDir = join(root, "drizzle", "manual");
const files = readdirSync(manualDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No .sql files in drizzle/manual — nothing to apply.");
  process.exit(0);
}

const sql = postgres(url, { max: 1 });

try {
  for (const name of files) {
    const body = readFileSync(join(manualDir, name), "utf8").trim();
    if (!body) continue;
    console.log("Applying", name, "…");
    await sql.unsafe(body);
  }
  console.log("Manual migrations finished.");
} finally {
  await sql.end();
}
