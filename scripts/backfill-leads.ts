/**
 * Backfill existing lead rows to match the corrected CSV semantics
 * (2026-04-22). Two fixes, both derived from `rawRow`:
 *
 *   1. resolvedAddress ← physical address assembled from
 *      Address/Address#2/City/State/Zip columns. Prior import assumed Places
 *      would geocode from company+property strings, which landed on the
 *      management HQ for many rows. The CSV address is the authoritative
 *      location of the property this contact manages.
 *
 *   2. propertyName ← null when it matches the management company string
 *      (case-insensitive). These are corporate contacts with no specific
 *      property; letting them group as a fake property polluted the list.
 *
 * The script only overwrites `resolvedAddress` when we can assemble a
 * non-empty address from the stored rawRow. It also resets enrichmentStatus
 * to `pending` on those rows so a subsequent enrichment pass re-geocodes
 * with the correct query.
 *
 * Usage:   bun run scripts/backfill-leads.ts            # dry run
 *          bun run scripts/backfill-leads.ts --apply    # actually write
 */

import { config } from "dotenv";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";

const root = resolve(import.meta.dirname, "..");
config({ path: join(root, ".env"), quiet: true });
config({ path: join(root, ".env.local"), override: true, quiet: true });

import { db } from "../src/db";
import { leads } from "../src/db/schema";

const ADDRESS_KEYS = ["address", "street address", "street"];
const ADDRESS_2_KEYS = ["address #2", "address 2", "address line 2", "suite", "unit"];
const CITY_KEYS = ["city", "town"];
const STATE_KEYS = ["state", "province", "region"];
const ZIP_KEYS = ["zip", "zip code", "postal code", "postcode"];

function pickRawValue(
  row: Record<string, string>,
  aliases: string[]
): string {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const hit = entries.find(([k]) => k.toLowerCase().trim() === alias);
    if (hit && hit[1]?.trim()) return hit[1].trim();
  }
  for (const alias of aliases) {
    const hit = entries.find(([k]) => k.toLowerCase().includes(alias));
    if (hit && hit[1]?.trim()) return hit[1].trim();
  }
  return "";
}

function buildCsvAddress(row: Record<string, string>): string | null {
  const street = pickRawValue(row, ADDRESS_KEYS);
  const street2 = pickRawValue(row, ADDRESS_2_KEYS);
  const city = pickRawValue(row, CITY_KEYS);
  const state = pickRawValue(row, STATE_KEYS);
  const zip = pickRawValue(row, ZIP_KEYS);
  if (!street && !city && !state && !zip) return null;
  const line1 = [street, street2].filter(Boolean).join(" ");
  const cityState = [city, state].filter(Boolean).join(", ");
  const tail = [cityState, zip].filter(Boolean).join(" ");
  return [line1, tail].filter(Boolean).join(", ").trim() || null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const all = await db.select().from(leads);

  let addressChanges = 0;
  let propertyNulls = 0;
  let untouched = 0;

  for (const lead of all) {
    const raw = lead.rawRow ?? null;
    const csvAddress = raw ? buildCsvAddress(raw) : null;

    const wantAddress =
      csvAddress && csvAddress !== (lead.resolvedAddress ?? "").trim()
        ? csvAddress
        : null;

    const propRaw = (lead.propertyName ?? "").trim();
    const companyRaw = (lead.company ?? "").trim();
    const wantPropertyNull =
      propRaw &&
      companyRaw &&
      propRaw.toLowerCase() === companyRaw.toLowerCase();

    if (!wantAddress && !wantPropertyNull) {
      untouched++;
      continue;
    }

    const patch: Partial<typeof leads.$inferInsert> = {};
    if (wantAddress) {
      patch.resolvedAddress = wantAddress;
      patch.enrichmentStatus = "pending";
      patch.enrichmentError = null;
      patch.latitude = null;
      patch.longitude = null;
      patch.googlePlaceId = null;
      addressChanges++;
    }
    if (wantPropertyNull) {
      patch.propertyName = null;
      propertyNulls++;
    }

    console.log(
      `${apply ? "UPDATE" : "DRYRUN"} ${lead.id} ${lead.name}` +
        (wantAddress ? `  addr="${wantAddress}"` : "") +
        (wantPropertyNull ? `  propertyName→null (was "${propRaw}")` : "")
    );

    if (apply) {
      await db.update(leads).set(patch).where(eq(leads.id, lead.id));
    }
  }

  console.log("");
  console.log(`Scanned:          ${all.length}`);
  console.log(`Address updates:  ${addressChanges}`);
  console.log(`propertyName nulls: ${propertyNulls}`);
  console.log(`Untouched:        ${untouched}`);
  console.log(
    apply
      ? "Applied. Run enrichment to re-geocode pending rows."
      : "Dry run. Re-run with --apply to write."
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
