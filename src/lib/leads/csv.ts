/**
 * Minimal CSV parser + column mapper for trade-show attendee lists.
 *
 * Scoped to what Phase A actually needs: RFC-4180-ish quoted fields, commas
 * as separators, CR/LF line endings. Good enough for Jordan's format. If we
 * hit exotic dialects later (semicolons, embedded newlines mid-row), swap to
 * Papa Parse.
 */

import type { LeadImportRow } from "@/lib/store";

/** Parse a CSV text blob into a header row + array of row objects. */
export function parseCsv(text: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return { headers: [], rows: [] };

  const lines = splitRows(normalized);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCells(lines[0]).map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCells(lines[i]);
    if (cells.every((c) => c.trim() === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Split a CSV body into logical lines, respecting quoted fields that can
 * contain newlines (RFC 4180).
 */
function splitRows(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      // Escaped quote ("") inside quoted field.
      if (inQuotes && text[i + 1] === '"') {
        buf += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      buf += c;
      continue;
    }
    if (c === "\n" && !inQuotes) {
      if (buf.length > 0) out.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

function splitCells(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buf += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  out.push(buf);
  return out;
}

/* ── Column detection ─────────────────────────────────────────────────── */

const COLUMN_ALIASES: Record<
  keyof Omit<LeadImportRow, "rawRow" | "csvAddress">,
  string[]
> = {
  name: ["name", "full name", "contact", "contact name"],
  email: ["email", "e-mail", "email address"],
  phone: ["phone", "mobile", "cell", "tel", "telephone", "phone number"],
  company: [
    "company",
    "organization",
    "org",
    "property management",
    "management company",
    "management",
    "owner",
  ],
  propertyName: [
    "property",
    "property name",
    "community",
    "community name",
    "building",
    "property/company",
  ],
};

const FIRST_NAME_ALIASES = ["first name", "firstname", "first"];
const LAST_NAME_ALIASES = ["last name", "lastname", "last", "surname"];

// CSV address pieces. The row-level physical address is authoritative for
// where this contact sits (per 2026-04-22 correction), so we assemble it
// explicitly rather than letting Places guess from property+company strings.
const ADDRESS_ALIASES = ["address", "street address", "street"];
const ADDRESS_2_ALIASES = ["address #2", "address 2", "address line 2", "suite", "unit"];
const CITY_ALIASES = ["city", "town"];
const STATE_ALIASES = ["state", "province", "region"];
const ZIP_ALIASES = ["zip", "zip code", "postal code", "postcode"];

export type ColumnMapping = {
  [K in keyof Omit<LeadImportRow, "rawRow" | "csvAddress">]: string | null;
} & {
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

/** Best-effort auto-map from CSV headers → lead fields. */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const pick = (aliases: string[]): string | null => {
    for (const alias of aliases) {
      const idx = lower.indexOf(alias);
      if (idx !== -1) return headers[idx];
    }
    // Loose contains-match as fallback.
    for (const alias of aliases) {
      const idx = lower.findIndex((h) => h.includes(alias));
      if (idx !== -1) return headers[idx];
    }
    return null;
  };

  return {
    name: pick(COLUMN_ALIASES.name),
    email: pick(COLUMN_ALIASES.email),
    phone: pick(COLUMN_ALIASES.phone),
    company: pick(COLUMN_ALIASES.company),
    propertyName: pick(COLUMN_ALIASES.propertyName),
    firstName: pick(FIRST_NAME_ALIASES),
    lastName: pick(LAST_NAME_ALIASES),
    address: pick(ADDRESS_ALIASES),
    address2: pick(ADDRESS_2_ALIASES),
    city: pick(CITY_ALIASES),
    state: pick(STATE_ALIASES),
    zip: pick(ZIP_ALIASES),
  };
}

function buildCsvAddress(
  row: Record<string, string>,
  mapping: ColumnMapping
): string | null {
  const street = mapping.address ? (row[mapping.address] ?? "").trim() : "";
  const street2 = mapping.address2 ? (row[mapping.address2] ?? "").trim() : "";
  const city = mapping.city ? (row[mapping.city] ?? "").trim() : "";
  const state = mapping.state ? (row[mapping.state] ?? "").trim() : "";
  const zip = mapping.zip ? (row[mapping.zip] ?? "").trim() : "";
  if (!street && !city && !state && !zip) return null;
  const line1 = [street, street2].filter(Boolean).join(" ");
  const cityState = [city, state].filter(Boolean).join(", ");
  const tail = [cityState, zip].filter(Boolean).join(" ");
  return [line1, tail].filter(Boolean).join(", ").trim() || null;
}

/** Apply a column mapping to raw CSV rows → LeadImportRows. Drops nameless rows. */
export function mapRowsToLeads(
  rows: Array<Record<string, string>>,
  mapping: ColumnMapping
): LeadImportRow[] {
  const out: LeadImportRow[] = [];
  for (const row of rows) {
    const full = mapping.name ? (row[mapping.name] ?? "").trim() : "";
    const first = mapping.firstName
      ? (row[mapping.firstName] ?? "").trim()
      : "";
    const last = mapping.lastName ? (row[mapping.lastName] ?? "").trim() : "";
    const name = full || [first, last].filter(Boolean).join(" ").trim();
    if (!name) continue;
    const emailRaw = mapping.email ? row[mapping.email]?.trim() : "";
    const phoneRaw = mapping.phone ? row[mapping.phone]?.trim() : "";
    const companyRaw = mapping.company ? row[mapping.company]?.trim() : "";
    const propRaw = mapping.propertyName
      ? row[mapping.propertyName]?.trim()
      : "";
    // If the CSV puts the same value in both Property and Management Company
    // (e.g. Property/Company="Highmark Residential", Management Company=
    // "Highmark Residential"), the row is a corporate-level contact with no
    // specific property. Null out propertyName so it doesn't grouph as a
    // fake property.
    const normalizedProperty =
      propRaw &&
      companyRaw &&
      propRaw.toLowerCase() === companyRaw.toLowerCase()
        ? null
        : propRaw || null;
    out.push({
      name,
      email: emailRaw || null,
      phone: phoneRaw || null,
      company: companyRaw || null,
      propertyName: normalizedProperty,
      csvAddress: buildCsvAddress(row, mapping),
      rawRow: row,
    });
  }
  return out;
}
