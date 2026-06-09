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
  ACCOUNT_TYPES,
  PROPERTY_PARTY_ROLES,
  BUILDING_ARCHETYPES,
  ACCESS_TYPES,
  EXPENSE_CATEGORIES,
  PAYMENT_TYPES,
  INVOICE_TYPES,
  INVOICE_STATUSES,
  CHANGE_ORDER_REASONS,
  CHANGE_ORDER_STATUSES,
} from "@/lib/status-meta";

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  website: text("website"),
  /** Owner vs. management company vs. other — drives NTO routing. */
  type: text("type", { enum: ACCOUNT_TYPES })
    .notNull()
    .default("management_company"),
  sourceTag: text("source_tag"),
  status: text("status").notNull().default("active"),
  /**
   * The AQP rep who owns this management-company relationship long-term (AQP
   * principle: "rep follows the firm"). Inherited onto new leads as ownerId.
   * Meaningful mainly when type = management_company.
   */
  internalRepId: uuid("internal_rep_id"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  /**
   * Legacy single account link, retained as a compatibility field. New code
   * reads `managementAccountId` / `ownerAccountId`; this still holds the
   * management company for rows created before the property-rooted re-model.
   */
  accountId: uuid("account_id").references(() => accounts.id),
  /** The management company for this property (legally distinct from owner). */
  managementAccountId: uuid("management_account_id").references(
    () => accounts.id,
  ),
  /** The legal owner — the lienable party Notice to Owner must reach. */
  ownerAccountId: uuid("owner_account_id").references(() => accounts.id),
  name: text("name"),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  googlePlaceId: text("google_place_id"),
  satelliteImageUrl: text("satellite_image_url"),
  enrichmentStatus: text("enrichment_status", { enum: ENRICHMENT_STATUSES }),
  enrichmentError: text("enrichment_error"),
  sourceTag: text("source_tag"),
  rawSource: jsonb("raw_source").$type<Record<string, string>>(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  accountId: uuid("account_id").references(() => accounts.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  sourceTag: text("source_tag"),
  relationshipTier: text("relationship_tier"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const propertyContacts = pgTable("property_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  role: text("role"),
  decisionInfluence: text("decision_influence"),
  sourceTag: text("source_tag"),
  importRef: jsonb("import_ref").$type<Record<string, string>>(),
  active: boolean("active").notNull().default(true),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  notes: text("notes").notNull().default(""),
});

/**
 * Parties tied to a property for legal/billing purposes. Captures who owns
 * it, who manages it, and which contact maps to which — the data Notice to
 * Owner generation depends on. `isNtoRecipient` marks the party NTO must be
 * served to (the owner; serving the manager forfeits lien rights). When the
 * legal owner has no account/contact record yet, the free-text
 * `legalOwnerName` / `legalOwnerAddress` capture it. See docs/plan.md →
 * "Property-rooted re-model" and docs/build-plans/property_rooted_remodel.plan.md.
 */
export const propertyParties = pgTable("property_parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  role: text("role", { enum: PROPERTY_PARTY_ROLES }).notNull(),
  isNtoRecipient: boolean("is_nto_recipient").notNull().default(false),
  legalOwnerName: text("legal_owner_name"),
  legalOwnerAddress: text("legal_owner_address"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Dated property↔management-company relationship (AQP principle #2 —
 * relationships have time). `endDate` null = current. A partial-unique index
 * (one current per property) is enforced in the migration. The current-state
 * `properties.management_account_id` FK is kept as a derived convenience.
 */
export const propertyMgmt = pgTable("property_mgmt", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Dated property↔owner relationship. Same shape as propertyMgmt. */
export const propertyOwner = pgTable("property_owner", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Dated contact↔company employment (AQP: contacts move between firms). The
 * current-state `contacts.account_id` FK is kept as a derived convenience.
 */
export const contactEmployment = pgTable("contact_employment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  title: text("title"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  propertyId: uuid("property_id").references(() => properties.id),
  primaryContactId: uuid("primary_contact_id").references(() => contacts.id),
  leadId: uuid("lead_id"),
  propertyName: text("property_name").notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  googlePlaceId: text("google_place_id"),
  satelliteImageUrl: text("satellite_image_url"),
  clientName: text("client_name").notNull(),
  /** Human label for the scoped opportunity, e.g. "Blue section". */
  label: text("label"),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: BID_STATUSES })
    .notNull()
    .default("draft"),
  coverageSqftPerGallon: numeric("coverage_sqft_per_gallon"),
  pricePerGallon: numeric("price_per_gallon"),
  laborRatePerUnit: numeric("labor_rate_per_unit"),
  marginPercent: numeric("margin_percent").default("0"),
  /* ── Delivery phase (the project) — null until won. Folds in what used to
        live on the separate `projects` table; see 018_project_spine.sql. ── */
  deliveryStatus: text("delivery_status", { enum: PROJECT_STATUSES }),
  targetStartDate: date("target_start_date"),
  targetEndDate: date("target_end_date"),
  actualStartDate: timestamp("actual_start_date", { withTimezone: true }),
  actualEndDate: timestamp("actual_end_date", { withTimezone: true }),
  assignedSub: text("assigned_sub"),
  crewLeadName: text("crew_lead_name"),
  acceptedByName: text("accepted_by_name"),
  acceptedByTitle: text("accepted_by_title"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  /**
   * Immutable contract baseline, snapshotted from the accepted proposal total
   * at acceptance (AQP reconciliation, Model A — the bid row IS the project,
   * so the money layer hangs off it). All profitability derives from this;
   * never recomputed. See docs/build-plans/aqp_reconciliation.plan.md.
   */
  contractValue: numeric("contract_value"),
  deliveryNotes: text("delivery_notes").notNull().default(""),
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
  /** Drives access scaling (mid_rise/high_rise need swing stage/lifts). */
  archetype: text("archetype", { enum: BUILDING_ARCHETYPES }),
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

/**
 * Access items: the scope dimension for how crews reach the surfaces (lifts,
 * scaffold, swing stage, safety). Sibling to buildings/surfaces — cost scales
 * by height/archetype, not square footage. `amount` is the explicit cost for
 * this phase; `rateDerived` reserves the future path where the deterministic
 * engine computes it from rate_config.access_rates. `bidId` re-parents to the
 * project spine in Phase 3 of the property-rooted re-model.
 */
export const accessItems = pgTable("access_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  buildingId: uuid("building_id").references(() => buildings.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ACCESS_TYPES }).notNull(),
  method: text("method"),
  quantity: numeric("quantity"),
  durationDays: integer("duration_days"),
  amount: numeric("amount").notNull().default("0"),
  rateDerived: boolean("rate_derived").notNull().default(false),
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
  propertyId: uuid("property_id").references(() => properties.id),
  accountId: uuid("account_id").references(() => accounts.id),
  primaryContactId: uuid("primary_contact_id").references(() => contacts.id),
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
  /** Drives the large/small takeoff + billing fork (AQP 2-week threshold). */
  isLargeJob: boolean("is_large_job").notNull().default(false),
  /** Scope tags, e.g. ["Full exterior","Breezeways"]. */
  scopeCategory: text("scope_category").array(),
  /** Rough $ estimate before takeoff — powers pipeline value/forecast. */
  estValue: numeric("est_value"),
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
  qualificationStatus: text("qualification_status"),
  priority: text("priority"),
  ownerId: uuid("owner_id"),
  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  qualificationBrief: text("qualification_brief"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leadContacts = pgTable("lead_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  propertyContactId: uuid("property_contact_id").references(
    () => propertyContacts.id,
    { onDelete: "set null" },
  ),
  role: text("role").notNull().default("primary"),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  propertyId: uuid("property_id").references(() => properties.id, {
    onDelete: "set null",
  }),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  bidId: uuid("bid_id").references(() => bids.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  actorUserId: uuid("actor_user_id"),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  changedFields: jsonb("changed_fields").$type<string[]>(),
  previousValues: jsonb("previous_values"),
  newValues: jsonb("new_values"),
  source: text("source").notNull().default("app"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Projects are no longer a separate table. The bid row IS the project after
 * the property-rooted re-model (Phase 3): delivery state lives on `bids`
 * (delivery_status, target/actual dates, assigned_sub, crew_lead_name,
 * accepted_*, delivery_notes). Dropped in 020_drop_projects.sql. The app-level
 * project shape is `ProjectView` in src/lib/store.ts.
 */

/**
 * Project updates: append-only feed of progress notes against a project.
 * `visible_on_public_url` is the contractor's opt-in switch for whether
 * an entry shows up on the post-acceptance status page at /p/[slug].
 * Defaults to false so internal-by-default is the safe choice. See PRD
 * §5.5 / §6.3.1.
 */
export const projectUpdates = pgTable("project_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Bid-spine parent (the project = the bid row). */
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
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

/**
 * Expenses: every dollar spent against a job, as dated rows (AQP principle #5
 * — money flows through dated events; job financial state is derived, never
 * stored). Keyed to the bid spine (the bid IS the project, Model A). `category`
 * + `paymentType` are canonical enums for clean reporting. See
 * docs/build-plans/aqp_reconciliation.plan.md.
 */
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  category: text("category", { enum: EXPENSE_CATEGORIES }).notNull(),
  paymentType: text("payment_type", { enum: PAYMENT_TYPES }),
  vendor: text("vendor"),
  description: text("description").notNull().default(""),
  amount: numeric("amount").notNull(),
  tax: numeric("tax").notNull().default("0"),
  invoiceNumber: text("invoice_number"),
  receiptUrl: text("receipt_url"),
  enteredBy: uuid("entered_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Change orders: scope additions/credits during a job (Phase 1b). `amount` is
 * signed (positive adds to the contract, negative credits). Approved change
 * orders adjust the derived contract baseline. Keyed to the bid spine.
 */
export const changeOrders = pgTable("change_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  number: text("number"),
  description: text("description").notNull().default(""),
  detail: text("detail").notNull().default(""),
  reason: text("reason", { enum: CHANGE_ORDER_REASONS }),
  amount: numeric("amount").notNull(),
  status: text("status", { enum: CHANGE_ORDER_STATUSES })
    .notNull()
    .default("draft"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Invoices: customer-facing billing against a job (Phase 1b). Large jobs bill
 * as draws on milestones; small jobs as deposit + final. Keyed to the bid
 * spine; CO invoices link back to a change order.
 */
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  number: text("number"),
  type: text("type", { enum: INVOICE_TYPES }).notNull().default("draw"),
  sequence: integer("sequence"),
  amount: numeric("amount").notNull(),
  status: text("status", { enum: INVOICE_STATUSES })
    .notNull()
    .default("pending"),
  trigger: text("trigger"),
  invoicedAt: date("invoiced_at"),
  dueAt: date("due_at"),
  paidAt: date("paid_at"),
  changeOrderId: uuid("change_order_id").references(() => changeOrders.id, {
    onDelete: "set null",
  }),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
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
 * Org-level rate config the deterministic pricing engine reads — the stored
 * source of truth for rates so the model never invents them (the receiving
 * end of the prompt-bidding boundary). Scalar paint rates mirror
 * user_defaults; `accessRates` holds per-archetype access pricing, e.g.
 * { swing_stage: { high_rise: 80000 }, lift: { mid_rise: 4500 } }. Keyed by
 * the org owner's user id, mirroring user_defaults.
 */
export const rateConfig = pgTable("rate_config", {
  userId: uuid("user_id").primaryKey(),
  coverageSqftPerGallon: numeric("coverage_sqft_per_gallon"),
  pricePerGallon: numeric("price_per_gallon"),
  laborRatePerUnit: numeric("labor_rate_per_unit"),
  marginPercent: numeric("margin_percent"),
  accessRates: jsonb("access_rates").$type<
    Record<string, Record<string, number>>
  >(),
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
 * Org membership: links additional users to an "org" identified by the
 * original signup user (`ownerUserId`). The owner has no row of their own
 * unless explicitly inserted; tenant queries scope by ownerUserId, which
 * for solo accounts is the user's own id. Pending invites have userId=null
 * and status='invited'; when the invitee signs in with the matching email
 * we backfill userId and flip status to 'active'.
 */
export const orgMemberships = pgTable("org_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull(),
  userId: uuid("user_id"),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("invited"),
  invitedAt: timestamp("invited_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedByUserId: uuid("invited_by_user_id"),
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
