---
name: Specs and Pricing Engine
overview: "Add pricing inputs (coverage, price/gallon, labor rate, margin) to bids, custom line items, user defaults with bidirectional flow, a live pricing calculator, and a settings page. Pricing saves back to user defaults so future bids auto-populate."
todos:
  - id: schema-pricing
    content: Add pricing columns to bids table, add lineItems and userDefaults tables to schema.ts. Push schema.
    status: completed
  - id: pricing-logic
    content: Create src/lib/pricing.ts with calculateBidPricing function
    status: completed
  - id: store-pricing
    content: Add line item CRUD, user defaults CRUD, and getBidWithPricing to store.ts
    status: completed
  - id: validations-pricing
    content: Add pricing, line item, and user defaults Zod schemas to validations.ts
    status: completed
  - id: actions-pricing
    content: Add pricing, line item, and defaults server actions to actions.ts. Update createBidAction to auto-populate from defaults.
    status: completed
  - id: ui-pricing-section
    content: Create PricingSection server component and PricingForm client component with live calculation
    status: completed
  - id: ui-line-items
    content: Create LineItemList and AddLineItemForm client components
    status: completed
  - id: wire-pricing-to-page
    content: Add PricingSection to bids/[id]/page.tsx between BuildingList and delete card
    status: completed
  - id: settings-page
    content: Create settings page with user defaults form, add Settings link to nav
    status: completed
  - id: verify-build
    content: Lint check and production build verification
    status: completed
isProject: false
---

# Specs and Pricing Engine

## Overview

Add a pricing engine to bids so contractors can enter material rates, labor rates, and margin to get a live dollar total. Includes custom line items (e.g. pressure washing, dumpster fees) and a bidirectional defaults system that learns from usage.

---

## Schema Changes

### New columns on `bids` table in [src/db/schema.ts](src/db/schema.ts)

```typescript
coverageSqftPerGallon: numeric("coverage_sqft_per_gallon"),
pricePerGallon: numeric("price_per_gallon"),
laborRatePerUnit: numeric("labor_rate_per_unit"),
marginPercent: numeric("margin_percent").default("0"),
```

All nullable — a bid can exist without pricing until the contractor is ready.

### New `line_items` table

```typescript
export const lineItems = pgTable("line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id").notNull().references(() => bids.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Custom add-on costs per bid (e.g. "Pressure washing", "Dumpster rental", "Scaffolding").

### New `user_defaults` table

```typescript
export const userDefaults = pgTable("user_defaults", {
  userId: uuid("user_id").primaryKey(),
  coverageSqftPerGallon: numeric("coverage_sqft_per_gallon"),
  pricePerGallon: numeric("price_per_gallon"),
  laborRatePerUnit: numeric("labor_rate_per_unit"),
  marginPercent: numeric("margin_percent"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Single row per user. The defaults flow works bidirectionally:

1. **Defaults seed new bids.** When creating a new bid, `createBidAction` fetches `getUserDefaults` and populates the four pricing fields. If no defaults exist yet, the fields are left null.
2. **Bids seed defaults.** Every time a user saves pricing on a bid (`updateBidPricingAction`), those values are upserted back to `user_defaults`. This means a user who skips the settings page entirely will still get defaults — the first bid where they enter pricing becomes the source of truth for all future bids.
3. **Settings page is optional.** It exists for users who want to review or adjust their defaults without opening a bid, but it is not required before creating the first bid.

### Defaults flow

The user does NOT need to visit the settings page before creating their first bid. The flow is:

1. User creates first bid — no defaults exist, pricing fields are null
2. User enters pricing on that bid (coverage, price/gallon, labor rate, margin)
3. On save, `updateBidPricingAction` writes those values to `user_defaults` automatically
4. User creates second bid — `createBidAction` reads `user_defaults` and pre-populates pricing
5. Every subsequent bid inherits the latest saved pricing as its starting point

The settings page lets users view and adjust defaults directly, but the primary path is: enter pricing once on a bid, and it carries forward.

---

## Pricing Logic

New file: [src/lib/pricing.ts](src/lib/pricing.ts)

`calculateBidPricing(input)` — pure function that computes:

- **Gallons needed** = total sqft / coverage per gallon
- **Material cost** = gallons * price per gallon
- **Labor cost** = total sqft * labor rate per sqft
- **Line items total** = sum of all custom line item amounts
- **Subtotal** = material + labor + line items
- **Margin** = subtotal * margin percent
- **Grand total** = subtotal + margin

Returns a `complete` flag indicating whether all required inputs are present. The UI uses this to show either the full breakdown or a prompt to enter missing values.

`formatCurrency(amount)` — formats a number as USD currency string.

---

## Data Layer

Added to [src/lib/store.ts](src/lib/store.ts):

- `updateBidPricing(id, data)` — updates the four pricing columns on a bid
- `getBidTotalSqft(bidId)` — aggregates total sqft across all buildings and surfaces (accounting for building count)
- `getLineItemsForBid(bidId)` — returns line items ordered by sort order
- `createLineItem(bidId, { name, amount })` — inserts with next sort order
- `updateLineItem(id, { name?, amount? })` — partial update
- `deleteLineItem(id)` — removes and touches bid's updatedAt
- `getUserDefaults()` — returns the current user's defaults row (or null)
- `upsertUserDefaults(data)` — insert or update on conflict

---

## Validation Schemas

Added to [src/lib/validations.ts](src/lib/validations.ts):

- `updateBidPricingSchema` — id (uuid) + four optional numeric fields (string/number/null → string or null)
- `createLineItemSchema` — bidId (uuid), name (min 1), amount (coerced number → string)
- `updateLineItemSchema` — id (uuid), bidId (uuid), name, amount
- `deleteLineItemSchema` — id (uuid), bidId (uuid)
- `updateUserDefaultsSchema` — four optional numeric fields

---

## Server Actions

Added to [src/lib/actions.ts](src/lib/actions.ts):

- `updateBidPricingAction` — saves pricing to bid AND upserts to user defaults
- `createLineItemAction`, `updateLineItemAction`, `deleteLineItemAction` — CRUD for line items
- `updateUserDefaultsAction` — direct defaults update from settings page
- Modified `createBidAction` — after creating a bid, reads user defaults and pre-populates pricing columns if defaults exist

---

## UI Components

### PricingSection ([src/components/pricing-section.tsx](src/components/pricing-section.tsx))

Server component that fetches bid, line items, and total sqft in parallel, then renders:

- `PricingForm` — the rate inputs and live calculation
- `LineItemList` — custom line items section

### PricingForm ([src/components/pricing-form.tsx](src/components/pricing-form.tsx))

Client component with:

- 4 numeric inputs: coverage (sqft/gal), price per gallon, labor rate ($/sqft), margin (%)
- Live calculation breakdown that updates on every keystroke using `calculateBidPricing`
- "Save pricing" button that persists to DB and upserts user defaults
- Shows appropriate empty states when sqft is 0 or inputs are incomplete

### LineItemList ([src/components/line-item-list.tsx](src/components/line-item-list.tsx))

Client component rendering a list of `LineItemRow` components plus an `AddLineItemForm`.

### LineItemRow ([src/components/line-item-row.tsx](src/components/line-item-row.tsx))

Client component for each line item with:

- Display mode: name + formatted amount, edit/delete buttons on hover
- Edit mode: inline inputs for name and amount

### AddLineItemForm ([src/components/add-line-item-form.tsx](src/components/add-line-item-form.tsx))

Client component: "Add line item" button that expands to inline form with description + amount inputs.

### DefaultsForm ([src/components/defaults-form.tsx](src/components/defaults-form.tsx))

Client component for the settings page — same 4 inputs as PricingForm but saves to user defaults directly.

---

## Pages

### Settings page ([src/app/settings/page.tsx](src/app/settings/page.tsx))

New page with the company pricing defaults form. Added "Settings" link to the global nav in [src/app/layout.tsx](src/app/layout.tsx).

### Bid detail page ([src/app/bids/[id]/page.tsx](src/app/bids/[id]/page.tsx))

`PricingSection` added between `BuildingList` and the delete card.

---

## Files Changed / Created

**Modified:**

- `src/db/schema.ts` — added pricing columns to bids, added lineItems and userDefaults tables
- `src/lib/store.ts` — added pricing, line item, and user defaults CRUD functions
- `src/lib/validations.ts` — added pricing, line item, and user defaults Zod schemas
- `src/lib/actions.ts` — added pricing, line item, and defaults server actions; updated createBidAction
- `src/app/bids/[id]/page.tsx` — added PricingSection
- `src/app/layout.tsx` — added Settings nav link

**Created:**

- `src/lib/pricing.ts` — pure pricing calculation engine
- `src/components/pricing-section.tsx` — server component composing pricing UI
- `src/components/pricing-form.tsx` — client component for rate inputs and live calculation
- `src/components/line-item-list.tsx` — client component for line item list
- `src/components/line-item-row.tsx` — client component for individual line item
- `src/components/add-line-item-form.tsx` — client component for adding line items
- `src/components/defaults-form.tsx` — client component for settings page defaults form
- `src/app/settings/page.tsx` — settings page
