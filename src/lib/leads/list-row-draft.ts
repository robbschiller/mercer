import type { ExtractedLeadDraft } from "@/lib/lead-draft";
import type { List, ListRow } from "@/lib/store";

/**
 * Convert (1b): a list row becomes the prefill for /leads/new. The row is
 * raw CSV, so everything lands editable in the intake form — the person
 * converting it confirms the property name, types the job name, and only
 * then do contact / property / account / lead get minted.
 */
export function listRowToDraft(row: ListRow & { list: List }): ExtractedLeadDraft {
  let first = row.firstName?.trim() || null;
  let last = row.lastName?.trim() || null;
  if (!first && !last) {
    const parts = row.name.trim().split(/\s+/);
    first = parts[0] ?? null;
    last = parts.slice(1).join(" ") || null;
  }
  return {
    projectName: null,
    propertyName: row.propertyName,
    propertyAddress: row.address,
    contactFirstName: first,
    contactLastName: last,
    phone: row.phone,
    email: row.email,
    company: row.company,
    source: row.list.sourceTag?.trim() || row.list.name,
    scope: [],
    scopeSummary: null,
    isLargeJob: null,
  };
}
