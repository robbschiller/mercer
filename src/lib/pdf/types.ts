export interface SnapshotSurface {
  name: string;
  dimensions: number[][] | null;
  totalSqft: number;
}

export interface SnapshotBuilding {
  label: string;
  count: number;
  /** Raw archetype enum (garden|townhome|mid_rise|high_rise|other); render via BUILDING_ARCHETYPE_LABELS. */
  archetype: string | null;
  surfaces: SnapshotSurface[];
  totalSqft: number;
}

export interface SnapshotLineItem {
  name: string;
  amount: number;
  /* ── Quote-engine lines (032) carry the full pricing breakdown; snapshots
        stamped before then have name+amount only, so all optional. ── */
  qty?: number | null;
  /** Raw unit string as stored on the line; render via pricingUnitLabel. */
  unit?: string | null;
  unitPrice?: number | null;
  /** Raw category enum; render via priceListCategoryLabel. */
  category?: string | null;
  sku?: string | null;
}

/**
 * Party block frozen into the proposal: who manages the property, who legally
 * owns it (the lienable party), and which contact NTO must be served to. Free
 * text so older snapshots without an account/contact row still render.
 */
export interface SnapshotParties {
  managementCompany: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  ntoRecipientName: string | null;
}

/**
 * Access scope (lift / scaffold / swing stage / safety). A sibling to surfaces
 * in the bid scope, rendered as its own section in the proposal because cost
 * scales by height/archetype, not square footage.
 */
export interface SnapshotAccessItem {
  /** Raw access type enum; render via ACCESS_TYPE_LABELS. */
  type: string;
  method: string | null;
  quantity: number | null;
  durationDays: number | null;
  amount: number;
}

export interface ProposalSnapshot {
  propertyName: string;
  address: string;
  clientName: string;
  notes: string;
  buildings: SnapshotBuilding[];
  lineItems: SnapshotLineItem[];
  /** Optional — present on proposals generated after Phase 4 of the property-rooted re-model. */
  accessItems?: SnapshotAccessItem[];
  /** Optional — present on proposals generated after Phase 4 of the property-rooted re-model. */
  parties?: SnapshotParties;
  totalSqft: number;
  grandTotal: number;
  /** Quote version stamped on the document. Optional — absent pre-032. */
  version?: number;
  generatedAt: string;
  /** In-memory only for PDF render; never persist to `proposals.snapshot`. */
  satelliteImageDataUri?: string;
}
