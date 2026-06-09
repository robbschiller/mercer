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

/**
 * Whether an account is the property's legal owner, its management company,
 * or something else. Drives Notice-to-Owner routing (the owner is the
 * lienable party). BAAA trade-show rows are management companies, so that
 * is the default for imported/auto-created accounts.
 */
export const ACCOUNT_TYPES = [
  "management_company",
  "owner",
  "other",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Role a party (account and/or contact) plays for a property. `owner` and
 * `management_company` are the legally distinct parties; `nto_recipient`
 * marks who Notice to Owner must be served to (forfeiting lien rights if
 * served to the manager instead of the owner).
 */
export const PROPERTY_PARTY_ROLES = [
  "owner",
  "management_company",
  "billing",
  "nto_recipient",
  "other",
] as const;
export type PropertyPartyRole = (typeof PROPERTY_PARTY_ROLES)[number];

/**
 * Building archetype — drives access scaling (e.g. a seven-story mid-rise
 * needs swing stage; a garden walk-up does not). Captured per building.
 */
export const BUILDING_ARCHETYPES = [
  "garden",
  "townhome",
  "mid_rise",
  "high_rise",
  "other",
] as const;
export type BuildingArchetype = (typeof BUILDING_ARCHETYPES)[number];

export const BUILDING_ARCHETYPE_LABELS: Record<BuildingArchetype, string> = {
  garden: "Garden",
  townhome: "Townhome",
  mid_rise: "Mid-rise",
  high_rise: "High-rise",
  other: "Other",
};

/**
 * Access method — a scope dimension that sits alongside surfaces and scales
 * by height/archetype rather than square footage (swing stage on a tall
 * building can run ~$80k). See docs/build-plans/property_rooted_remodel.plan.md.
 */
export const ACCESS_TYPES = [
  "lift",
  "scaffold",
  "swing_stage",
  "safety",
  "other",
] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  lift: "Lift",
  scaffold: "Scaffold",
  swing_stage: "Swing stage",
  safety: "Safety",
  other: "Other",
};

export function buildingArchetypeLabel(value: string | null): string {
  if (!value) return "—";
  return BUILDING_ARCHETYPE_LABELS[value as BuildingArchetype] ?? value;
}

export function accessTypeLabel(value: string): string {
  return ACCESS_TYPE_LABELS[value as AccessType] ?? value;
}

// ── Money layer (AQP reconciliation, Phase 1) ──
// Canonical expense categories (the 15 large-job buckets + a catch-all). Per
// the AQP reconciliation these eventually become per-org config; canonical
// constants for now. See docs/build-plans/aqp_reconciliation.plan.md.
export const EXPENSE_CATEGORIES = [
  "staging",
  "lifts",
  "primer_sealer",
  "topcoat",
  "metal_paint_primer",
  "floor_paint",
  "supplies",
  "caulk",
  "patch",
  "cleaners",
  "misc_supplies",
  "travel",
  "repairs",
  "non_paint_labor",
  "paint_labor",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  staging: "Staging",
  lifts: "Lifts",
  primer_sealer: "Primer / sealer",
  topcoat: "Topcoat",
  metal_paint_primer: "Metal paint / primer",
  floor_paint: "Floor paint",
  supplies: "Supplies",
  caulk: "Caulk",
  patch: "Patch",
  cleaners: "Cleaners",
  misc_supplies: "Misc supplies",
  travel: "Travel",
  repairs: "Repairs",
  non_paint_labor: "Non-paint labor",
  paint_labor: "Paint labor",
  other: "Other",
};

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORY_LABELS[value as ExpenseCategory] ?? value;
}

export const PAYMENT_TYPES = [
  "spark_cc",
  "amex",
  "chase",
  "ach",
  "check",
  "sw_charge",
  "hd_charge",
  "florida_paints",
  "lanco",
  "cash",
  "refund",
  "other",
] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  spark_cc: "Spark CC",
  amex: "Amex",
  chase: "Chase",
  ach: "ACH",
  check: "Check",
  sw_charge: "SW charge",
  hd_charge: "HD charge",
  florida_paints: "Florida Paints",
  lanco: "Lanco",
  cash: "Cash",
  refund: "Refund",
  other: "Other",
};

export function paymentTypeLabel(value: string): string {
  return PAYMENT_TYPE_LABELS[value as PaymentType] ?? value;
}

// ── Money layer Phase 1b: invoices + change orders ──

export const INVOICE_TYPES = [
  "mobilization",
  "draw",
  "deposit",
  "final",
  "change_order",
  "other",
] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  mobilization: "Mobilization",
  draw: "Draw",
  deposit: "Deposit",
  final: "Final",
  change_order: "Change order",
  other: "Other",
};

export function invoiceTypeLabel(value: string): string {
  return INVOICE_TYPE_LABELS[value as InvoiceType] ?? value;
}

export const INVOICE_STATUSES = [
  "pending",
  "invoiced",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Pending",
  invoiced: "Invoiced",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_VARIANTS: Record<InvoiceStatus, BadgeVariant> = {
  pending: "secondary",
  invoiced: "outline",
  paid: "default",
  overdue: "secondary",
  cancelled: "secondary",
};

export function invoiceStatusLabel(value: string): string {
  return INVOICE_STATUS_LABELS[value as InvoiceStatus] ?? value;
}
export function invoiceStatusVariant(value: string): BadgeVariant {
  return INVOICE_STATUS_VARIANTS[value as InvoiceStatus] ?? "secondary";
}

export const CHANGE_ORDER_REASONS = [
  "discovered_during_work",
  "customer_requested",
  "scope_correction",
  "weather",
  "other",
] as const;
export type ChangeOrderReason = (typeof CHANGE_ORDER_REASONS)[number];

export const CHANGE_ORDER_REASON_LABELS: Record<ChangeOrderReason, string> = {
  discovered_during_work: "Discovered during work",
  customer_requested: "Customer requested",
  scope_correction: "Scope correction",
  weather: "Weather",
  other: "Other",
};

export function changeOrderReasonLabel(value: string): string {
  return CHANGE_ORDER_REASON_LABELS[value as ChangeOrderReason] ?? value;
}

export const CHANGE_ORDER_STATUSES = [
  "draft",
  "sent",
  "approved",
  "denied",
] as const;
export type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];

export const CHANGE_ORDER_STATUS_LABELS: Record<ChangeOrderStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  denied: "Denied",
};

export const CHANGE_ORDER_STATUS_VARIANTS: Record<
  ChangeOrderStatus,
  BadgeVariant
> = {
  draft: "secondary",
  sent: "outline",
  approved: "default",
  denied: "secondary",
};

export function changeOrderStatusLabel(value: string): string {
  return CHANGE_ORDER_STATUS_LABELS[value as ChangeOrderStatus] ?? value;
}
export function changeOrderStatusVariant(value: string): BadgeVariant {
  return CHANGE_ORDER_STATUS_VARIANTS[value as ChangeOrderStatus] ?? "secondary";
}

// ── Phase 3: service catalog + supplier pricing ──

export const PRICE_LIST_CATEGORIES = [
  "painting",
  "pressure_washing",
  "wood_repair",
  "stair_systems",
  "caulking",
  "gutters",
  "other",
] as const;
export type PriceListCategory = (typeof PRICE_LIST_CATEGORIES)[number];

export const PRICE_LIST_CATEGORY_LABELS: Record<PriceListCategory, string> = {
  painting: "Painting",
  pressure_washing: "Pressure washing",
  wood_repair: "Wood repair",
  stair_systems: "Stair systems",
  caulking: "Caulking",
  gutters: "Gutters",
  other: "Other",
};

export function priceListCategoryLabel(value: string): string {
  return PRICE_LIST_CATEGORY_LABELS[value as PriceListCategory] ?? value;
}

export const PRICING_UNITS = [
  "sf",
  "lf",
  "qty",
  "each",
  "system",
  "bldg",
  "unit",
] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  sf: "per sq ft",
  lf: "per linear ft",
  qty: "per qty",
  each: "each",
  system: "per system",
  bldg: "per building",
  unit: "per unit",
};

export function pricingUnitLabel(value: string): string {
  return PRICING_UNIT_LABELS[value as PricingUnit] ?? value;
}

export const SUPPLIER_PRODUCT_TYPES = [
  "paint",
  "primer",
  "caulk",
  "cleaner",
  "equipment",
  "consumable",
] as const;
export type SupplierProductType = (typeof SUPPLIER_PRODUCT_TYPES)[number];

export const SUPPLIER_PRODUCT_TYPE_LABELS: Record<SupplierProductType, string> =
  {
    paint: "Paint",
    primer: "Primer",
    caulk: "Caulk",
    cleaner: "Cleaner",
    equipment: "Equipment",
    consumable: "Consumable",
  };

export function supplierProductTypeLabel(value: string): string {
  return SUPPLIER_PRODUCT_TYPE_LABELS[value as SupplierProductType] ?? value;
}

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
