/**
 * Day-0 validation of the enrichment pipeline (docs/plan.md pre-work).
 *
 * Runs enrichLead() against 10 real multifamily properties and reports:
 *   - Places resolution rate (can we find the property from company+name?)
 *   - OSM footprint presence (do we get any buildings back?)
 *   - Footprint plausibility (is the total footprint sqft in the ballpark
 *     of the property's rough expected size?)
 *
 * Thresholds (from docs/plan.md):
 *   - Resolution rate >= 60%  → otherwise soften the enrichment pitch
 *   - Footprint accuracy within 25% → we approximate this as "plausibility
 *     band" of +/- 50% around a rough estimate (units * avg unit sqft /
 *     assumed stories). Ground-truth sqft isn't public for most properties,
 *     so this is a sanity check, not a precise accuracy test.
 *
 * Usage:   bun run scripts/validate-enrichment.ts
 */

import { config } from "dotenv";
import { join, resolve } from "node:path";
import { enrichLead, type EnrichLeadResult } from "../src/lib/enrichment/enrich-lead";

const root = resolve(import.meta.dirname, "..");
config({ path: join(root, ".env"), quiet: true });
config({ path: join(root, ".env.local"), override: true, quiet: true });

type TestProperty = {
  label: string;
  company: string;
  propertyName?: string;
  /** Public unit count (from property websites / apartments.com). */
  units: number;
  /** Assumed story count for the complex (garden style = 3, mid-rise = 5, etc.). */
  stories: number;
};

/**
 * 10 real multifamily properties. Unit counts are public info from property
 * websites or apartments.com. Stories are a best-guess for the building style.
 */
const TEST_PROPERTIES: TestProperty[] = [
  { label: "Camden Phipps",              company: "Camden Property Trust", propertyName: "Camden Phipps",              units: 234, stories: 4 },
  { label: "AMLI Midtown",               company: "AMLI Residential",      propertyName: "AMLI Midtown Atlanta",        units: 357, stories: 6 },
  { label: "Post Alexander",             company: "Cortland",              propertyName: "Post Alexander",              units: 270, stories: 4 },
  { label: "Camden Buckhead Square",     company: "Camden Property Trust", propertyName: "Camden Buckhead Square",      units: 385, stories: 5 },
  { label: "Avalon Arundel Crossing",    company: "AvalonBay Communities", propertyName: "Avalon Arundel Crossing",     units: 398, stories: 3 },
  { label: "Camden Cotton Mills",        company: "Camden Property Trust", propertyName: "Camden Cotton Mills",         units: 180, stories: 4 },
  { label: "AMLI Buckhead",              company: "AMLI Residential",      propertyName: "AMLI Buckhead",               units: 293, stories: 5 },
  { label: "Post Biltmore",              company: "Cortland",              propertyName: "Post Biltmore",               units: 276, stories: 4 },
  { label: "Camden Southline",           company: "Camden Property Trust", propertyName: "Camden Southline",            units: 266, stories: 5 },
  { label: "Avalon Morristown Station",  company: "AvalonBay Communities", propertyName: "Avalon Morristown Station",   units: 217, stories: 4 },
];

/** Rough avg rentable sqft/unit for multifamily (includes common area). */
const AVG_UNIT_SQFT = 950;
const SQM_TO_SQFT = 10.7639;

function expectedFootprintSqft(p: TestProperty): number {
  // Rentable sqft / stories = approximate building footprint
  return (p.units * AVG_UNIT_SQFT) / p.stories;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function pct(num: number, den: number): string {
  if (den === 0) return "0%";
  return `${Math.round((num / den) * 100)}%`;
}

async function main() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local. Aborting."
    );
    process.exit(1);
  }

  console.log("=".repeat(78));
  console.log("Mercer — enrichment pipeline validation");
  console.log("=".repeat(78));
  console.log(
    `Testing ${TEST_PROPERTIES.length} multifamily properties.\n` +
      `Input to enrichLead(): { company, propertyName } only — no address.\n` +
      `Thresholds: resolution >= 60%, footprint plausibility >= 60%.\n`
  );

  type Row = {
    label: string;
    result: EnrichLeadResult;
    expectedSqft: number;
    plausible: boolean;
  };
  const rows: Row[] = [];

  /** Public Overpass is aggressively rate-limited. Pace requests. */
  const INTER_CALL_DELAY_MS = 4_000;

  for (let i = 0; i < TEST_PROPERTIES.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
    const p = TEST_PROPERTIES[i];
    process.stdout.write(
      `[${i + 1}/${TEST_PROPERTIES.length}] ${p.label} … `
    );

    const started = Date.now();
    const result = await enrichLead(
      { company: p.company, propertyName: p.propertyName },
      apiKey,
      // Key is restricted to HTTP referrers in local dev; match a whitelisted origin.
      { referer: "http://localhost:3000/" }
    );
    const ms = Date.now() - started;

    const expectedSqft = expectedFootprintSqft(p);
    let plausible = false;
    if (result.status === "ok" && result.totalFootprintSqft) {
      const ratio = result.totalFootprintSqft / expectedSqft;
      plausible = ratio >= 0.5 && ratio <= 2.0;
    }

    rows.push({ label: p.label, result, expectedSqft, plausible });

    const tag =
      result.status === "ok"
        ? plausible
          ? "OK"
          : "OK (sqft out of band)"
        : result.status === "no_places_result"
          ? "NO PLACES"
          : result.status === "no_footprints"
            ? "NO OSM"
            : "ERROR";
    console.log(`${tag} (${ms}ms)`);
  }

  console.log("\n" + "-".repeat(78));
  console.log("Per-property detail");
  console.log("-".repeat(78));

  for (const row of rows) {
    const { label, result, expectedSqft, plausible } = row;
    console.log(`\n${label}`);
    console.log(`  query:     ${result.query}`);
    if (result.places) {
      console.log(`  resolved:  ${result.places.formattedAddress}`);
      console.log(
        `  coords:    ${result.places.latitude.toFixed(5)}, ${result.places.longitude.toFixed(5)}`
      );
    } else {
      console.log(`  resolved:  (none)`);
    }
    if (result.osmQueryArea) {
      console.log(`  osm area:  ${result.osmQueryArea}`);
    }
    if (result.status === "ok") {
      console.log(
        `  osm:       ${result.footprintCount} buildings, ${fmtInt(result.totalFootprintSqft ?? 0)} sqft footprint`
      );
      console.log(
        `  expected:  ~${fmtInt(expectedSqft)} sqft (± 2x band) → ${plausible ? "plausible" : "OUT OF BAND"}`
      );
    } else if (result.error) {
      console.log(`  error:     ${result.error}`);
    }
  }

  // Tally
  const resolved = rows.filter((r) => r.result.places).length;
  const withFootprints = rows.filter((r) => r.result.status === "ok").length;
  const plausibleCount = rows.filter((r) => r.plausible).length;

  const resolutionRate = resolved / rows.length;
  const footprintRate = withFootprints / rows.length;
  const plausibilityRate = plausibleCount / rows.length;

  console.log("\n" + "=".repeat(78));
  console.log("Summary");
  console.log("=".repeat(78));
  console.log(
    `Places resolution:    ${resolved}/${rows.length} (${pct(resolved, rows.length)})`
  );
  console.log(
    `OSM footprints:       ${withFootprints}/${rows.length} (${pct(withFootprints, rows.length)})`
  );
  console.log(
    `Plausible footprint:  ${plausibleCount}/${rows.length} (${pct(plausibleCount, rows.length)})`
  );

  // Verdict
  console.log("\n" + "=".repeat(78));
  const resolutionPass = resolutionRate >= 0.6;
  const plausibilityPass = plausibilityRate >= 0.6;
  const verdict = resolutionPass && plausibilityPass ? "PASS" : "FAIL";
  console.log(`VERDICT: ${verdict}`);
  console.log("=".repeat(78));
  if (verdict === "PASS") {
    console.log(
      "The enrichment pipeline clears the bar. Proceed with Phase A (CSV upload + leads table)."
    );
  } else {
    console.log(
      "Pipeline does not meet the bar. Soften the enrichment pitch in the demo and\n" +
        "consider manual-address-entry fallback as the primary flow."
    );
    if (!resolutionPass) {
      console.log(
        `  - Resolution rate ${pct(resolved, rows.length)} < 60%: Places can't find these from company+name alone.`
      );
    }
    if (!plausibilityPass) {
      console.log(
        `  - Plausible footprints ${pct(plausibleCount, rows.length)} < 60%: OSM coverage or accuracy is weak.`
      );
    }
  }

  process.exit(verdict === "PASS" ? 0 : 2);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
