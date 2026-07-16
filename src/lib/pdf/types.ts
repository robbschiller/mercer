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
  /** Unit-rate line: priced per unit, billed as found, out of the total. */
  rateOnly?: boolean;
  /** Raw category enum; render via priceListCategoryLabel. */
  category?: string | null;
  sku?: string | null;
  /** The takeoff photo that motivated this line — the proposal's scope story. */
  evidencePhotoUrl?: string | null;
}

/**
 * Company branding frozen into the proposal at stamp time (Yvonne-test D) —
 * a later rebrand must not repaint documents customers already received.
 */
export interface SnapshotBrand {
  companyName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  aboutBlurb: string | null;
  credentials: string | null;
  phone: string | null;
  email: string | null;
  /** {recipient}, {property}, {total} merge fields; recipient is per-share. */
  coverLetterTemplate: string | null;
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

/**
 * The sales-document layer (proposal composer §A2): AI-composed COPY for a
 * FIXED template — the model fills slots, never invents structure, so every
 * proposal renders identically (Jordan's consistency requirement). Assembled
 * at stamp from org knowledge (messaging guide, testimonials, company facts)
 * and frozen with the snapshot. All fields nullable: a missing document (or
 * missing slot) renders the pre-A2 layout gracefully.
 */
export interface SnapshotDocument {
  /** One sentence under the property name on the cover. */
  coverSubtitle: string | null;
  /** "Why us" header line, e.g. "One painting partner. Zero fire drills." */
  whyUsHeadline: string | null;
  /** Short paragraph aimed at the recipient's role (PM/board). */
  whyUsBody: string | null;
  /** The org's standing promises — title + one-line body each (≤6). */
  promises: { title: string; body: string }[];
  /** Stat chips, e.g. "250+ | communities completed". */
  statChips: { value: string; label: string }[];
  /** Scope page intro paragraph. */
  scopeIntro: string | null;
  /** "What's included" bullets — bold lead + sentence each. */
  included: { title: string; body: string }[];
  /** Investment stats alongside the one number. */
  perSf: number | null;
  perUnit: number | null;
  unitCount: number | null;
  /** e.g. "5–6 weeks on site". */
  durationLine: string | null;
  scheduleBody: string | null;
  paymentSchedule: { milestone: string; sharePct: number; amount: number }[];
  /** Published-rates section intro (the no-leverage promise). */
  publishedRatesIntro: string | null;
  whatToExpect: { title: string; body: string }[];
  testimonials: { quote: string; attribution: string }[];
  /** Terms bullets: "Price." / "Warranty." style lead-ins included in text. */
  terms: string[];
  /** ISO date the price is held through — also shown as the CTA urgency. */
  priceHeldThrough: string | null;
  /** Sign-off line above the acceptance block. */
  acceptanceCta: string | null;
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
  /** Optional — present on proposals stamped after the Yvonne-test batch. */
  brand?: SnapshotBrand;
  /** Hero image for the branded proposal (best bid photo, else satellite). */
  coverPhotoUrl?: string | null;
  /** The sales-document copy layer (§A2) — absent on older snapshots. */
  document?: SnapshotDocument | null;
  /**
   * INTERNAL ONLY — the takeoff budget frozen with this version (proposal
   * composer Phase 1). Never rendered on the customer PDF or share page;
   * it's the cost basis this quote was judged against.
   */
  internalBudget?: {
    data: unknown;
    buildUpTotal: number;
    marginOverBuildUp: number;
  };
  generatedAt: string;
  /** In-memory only for PDF render; never persist to `proposals.snapshot`. */
  satelliteImageDataUri?: string;
}
