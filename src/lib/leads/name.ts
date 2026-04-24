import type { Lead } from "@/lib/store";

const FIRST_NAME_KEYS = ["First Name", "first name", "firstname", "First"];
const LAST_NAME_KEYS = ["Last Name", "last name", "lastname", "Last", "Surname"];

function pickKey(
  raw: Record<string, string>,
  exact: string[],
  fuzzy: RegExp
): string {
  for (const k of exact) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [k, v] of Object.entries(raw)) {
    if (fuzzy.test(k) && typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Return the display name for a lead, always including the last name when
 * we have it. Many of our imports landed with only a first name stored in
 * `lead.name` because the CSV had separate "First Name" / "Last Name"
 * columns. This helper falls back on rawRow so legacy rows still render
 * a full name without a re-import. New imports combine both columns up
 * front (see mapRowsToLeads).
 */
export function leadFullName(lead: Pick<Lead, "name" | "rawRow">): string {
  const stored = (lead.name ?? "").trim();
  const raw = lead.rawRow;
  if (!raw) return stored;
  const first = pickKey(raw, FIRST_NAME_KEYS, /first.?name|^first$/i);
  const last = pickKey(raw, LAST_NAME_KEYS, /last.?name|surname|^last$/i);
  if (first && last) return `${first} ${last}`;
  if (stored && last && !stored.toLowerCase().includes(last.toLowerCase())) {
    return `${stored} ${last}`;
  }
  return stored || first || last;
}
