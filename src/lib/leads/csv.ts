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

const COLUMN_ALIASES: Record<keyof Omit<LeadImportRow, "rawRow">, string[]> = {
  name: ["name", "full name", "contact", "contact name", "first name"],
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
  ],
};

export type ColumnMapping = {
  [K in keyof Omit<LeadImportRow, "rawRow">]: string | null;
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
  };
}

/** Apply a column mapping to raw CSV rows → LeadImportRows. Drops nameless rows. */
export function mapRowsToLeads(
  rows: Array<Record<string, string>>,
  mapping: ColumnMapping
): LeadImportRow[] {
  const out: LeadImportRow[] = [];
  for (const row of rows) {
    const nameCol = mapping.name;
    const name = nameCol ? (row[nameCol] ?? "").trim() : "";
    if (!name) continue;
    const emailRaw = mapping.email ? row[mapping.email]?.trim() : "";
    const phoneRaw = mapping.phone ? row[mapping.phone]?.trim() : "";
    const companyRaw = mapping.company ? row[mapping.company]?.trim() : "";
    const propRaw = mapping.propertyName
      ? row[mapping.propertyName]?.trim()
      : "";
    out.push({
      name,
      email: emailRaw || null,
      phone: phoneRaw || null,
      company: companyRaw || null,
      propertyName: propRaw || null,
      rawRow: row,
    });
  }
  return out;
}
