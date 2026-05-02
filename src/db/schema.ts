import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  numeric,
  doublePrecision,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import {
  BID_STATUSES,
  LEAD_STATUSES,
  ENRICHMENT_STATUSES,
  PROJECT_STATUSES,
  PROJECT_UPDATE_AUTHOR_TYPES,
} from "@/lib/status-meta";

export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  leadId: uuid("lead_id"),
  propertyName: text("property_name").notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  googlePlaceId: text("google_place_id"),
  satelliteImageUrl: text("satellite_image_url"),
  clientName: text("client_name").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: BID_STATUSES })
    .notNull()
    .default("draft"),
  coverageSqftPerGallon: numeric("coverage_sqft_per_gallon"),
  pricePerGallon: numeric("price_per_gallon"),
  laborRatePerUnit: numeric("labor_rate_per_unit"),
  marginPercent: numeric("margin_percent").default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const buildings = pgTable("buildings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  count: integer("count").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const surfaces = pgTable("surfaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => buildings.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dimensions: jsonb("dimensions").$type<number[][]>(),
  totalSqft: numeric("total_sqft"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lineItems = pgTable("line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot").notNull(),
  pdfUrl: text("pdf_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const proposalShares = pgTable("proposal_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id")
    .notNull()
    .references(() => proposals.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  accessedAt: timestamp("accessed_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedByName: text("accepted_by_name"),
  acceptedByTitle: text("accepted_by_title"),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  declineReason: text("decline_reason"),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  sourceTag: text("source_tag"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  propertyName: text("property_name"),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: LEAD_STATUSES })
    .notNull()
    .default("new"),
  /* ── Enrichment fields (populated asynchronously by enrichLead worker) ── */
  resolvedAddress: text("resolved_address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  googlePlaceId: text("google_place_id"),
  satelliteImageUrl: text("satellite_image_url"),
  enrichmentStatus: text("enrichment_status", { enum: ENRICHMENT_STATUSES }),
  enrichmentError: text("enrichment_error"),
  /** Untransformed CSV row — keeps columns we didn't map for later use. */
  rawRow: jsonb("raw_row").$type<Record<string, string>>(),
  /* ── Outreach state ─────────────────────────────────────────────────── */
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  followUpAt: date("follow_up_at"),
  contactAttempts: integer("contact_attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Projects: created automatically when a proposal_share is accepted.
 * One project per bid (UNIQUE bid_id supports ON CONFLICT DO NOTHING
 * idempotency on accept). Owns post-acceptance delivery metadata; the bid
 * stays the immutable contract artifact. See PRD §5.5 / §6.3.
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .notNull()
    .unique()
    .references(() => bids.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  status: text("status", { enum: PROJECT_STATUSES })
    .notNull()
    .default("not_started"),
  targetStartDate: date("target_start_date"),
  targetEndDate: date("target_end_date"),
  actualStartDate: timestamp("actual_start_date", { withTimezone: true }),
  actualEndDate: timestamp("actual_end_date", { withTimezone: true }),
  assignedSub: text("assigned_sub"),
  crewLeadName: text("crew_lead_name"),
  acceptedByName: text("accepted_by_name"),
  acceptedByTitle: text("accepted_by_title"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Project updates: append-only feed of progress notes against a project.
 * `visible_on_public_url` is the contractor's opt-in switch for whether
 * an entry shows up on the post-acceptance status page at /p/[slug].
 * Defaults to false so internal-by-default is the safe choice. See PRD
 * §5.5 / §6.3.1.
 */
export const projectUpdates = pgTable("project_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  authorType: text("author_type", { enum: PROJECT_UPDATE_AUTHOR_TYPES })
    .notNull()
    .default("human"),
  authorName: text("author_name").notNull().default(""),
  body: text("body").notNull(),
  attachmentsRef: jsonb("attachments_ref"),
  visibleOnPublicUrl: boolean("visible_on_public_url")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userDefaults = pgTable("user_defaults", {
  userId: uuid("user_id").primaryKey(),
  coverageSqftPerGallon: numeric("coverage_sqft_per_gallon"),
  pricePerGallon: numeric("price_per_gallon"),
  laborRatePerUnit: numeric("labor_rate_per_unit"),
  marginPercent: numeric("margin_percent"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Company profile: brand data captured by the onboarding wizard and
 * surfaced on the themed bid (PDF + /p/[slug]). One row per user; mirrors
 * the user_defaults pattern. Populated by the LLM extractor against
 * `website_url`, then editable on /settings → "Bid branding". See PRD
 * §5.4 (proposal as live surface) and docs/plan.md → Phase G.
 */
export const companyProfiles = pgTable("company_profiles", {
  userId: uuid("user_id").primaryKey(),
  websiteUrl: text("website_url"),
  companyName: text("company_name"),
  tagline: text("tagline"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  phone: text("phone"),
  email: text("email"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  bodyFont: text("body_font"),
  enrichmentStatus: text("enrichment_status"),
  enrichmentError: text("enrichment_error"),
  enrichmentRaw: jsonb("enrichment_raw"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Onboarding state: per-step timestamps for the post-signup wizard.
 * Existence of a row with completedAt or skipped=true releases the
 * (app)/layout gate. See docs/plan.md → Phase G.
 */
export const onboardings = pgTable("onboardings", {
  userId: uuid("user_id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  websiteSubmittedAt: timestamp("website_submitted_at", {
    withTimezone: true,
  }),
  profileConfirmedAt: timestamp("profile_confirmed_at", {
    withTimezone: true,
  }),
  themeConfirmedAt: timestamp("theme_confirmed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  skipped: boolean("skipped").notNull().default(false),
});
