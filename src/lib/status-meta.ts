/**
 * Single source of truth for status enums + their UI labels and Badge variants.
 *
 * The Drizzle schema (`src/db/schema.ts`) declares the same enum strings via
 * `text(..., { enum: [...] })`; Zod validators in `src/lib/validations.ts`
 * derive their `.enum(...)` from the const arrays here so the three layers
 * cannot drift.
 */

export const BID_STATUSES = ["draft", "sent", "won", "lost"] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

export const LEAD_STATUSES = ["new", "quoted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ENRICHMENT_STATUSES = [
  "pending",
  "success",
  "failed",
  "skipped",
] as const;
export type EnrichmentStatus = (typeof ENRICHMENT_STATUSES)[number];

export const PROJECT_STATUSES = [
  "not_started",
  "in_progress",
  "punch_out",
  "complete",
  "on_hold",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_UPDATE_AUTHOR_TYPES = [
  "human",
  "crew_auto",
  "agent",
] as const;
export type ProjectUpdateAuthorType =
  (typeof PROJECT_UPDATE_AUTHOR_TYPES)[number];

type BadgeVariant = "default" | "secondary" | "outline";

export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  won: "Won",
  lost: "Lost",
};

export const BID_STATUS_VARIANTS: Record<BidStatus, BadgeVariant> = {
  draft: "secondary",
  sent: "outline",
  won: "default",
  lost: "secondary",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export const LEAD_STATUS_VARIANTS: Record<LeadStatus, BadgeVariant> = {
  new: "secondary",
  quoted: "outline",
  won: "default",
  lost: "secondary",
};

export const ENRICHMENT_LABELS: Record<EnrichmentStatus, string> = {
  pending: "Enriching…",
  success: "Enriched",
  failed: "Enrichment failed",
  skipped: "Skipped",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  punch_out: "Punch out",
  complete: "Complete",
  on_hold: "On hold",
};

export const PROJECT_STATUS_VARIANTS: Record<ProjectStatus, BadgeVariant> = {
  not_started: "secondary",
  in_progress: "default",
  punch_out: "outline",
  complete: "default",
  on_hold: "secondary",
};

export function bidStatusLabel(status: string): string {
  return BID_STATUS_LABELS[status as BidStatus] ?? status;
}

export function bidStatusVariant(status: string): BadgeVariant {
  return BID_STATUS_VARIANTS[status as BidStatus] ?? "secondary";
}

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}

export function leadStatusVariant(status: string): BadgeVariant {
  return LEAD_STATUS_VARIANTS[status as LeadStatus] ?? "secondary";
}

export function enrichmentLabel(status: string): string {
  return ENRICHMENT_LABELS[status as EnrichmentStatus] ?? status;
}

export function projectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status;
}

export function projectStatusVariant(status: string): BadgeVariant {
  return PROJECT_STATUS_VARIANTS[status as ProjectStatus] ?? "secondary";
}
