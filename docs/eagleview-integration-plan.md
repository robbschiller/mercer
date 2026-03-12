# EagleView API Integration Plan (Phase 3)

This plan covers integrating EagleView's Measurement Orders API so that a contractor can enter an address and have aerial measurement data auto-populate building measurements — turning the app into a truly remote bidding tool.

---

## Why EagleView

EagleView provides aerial roof and wall measurements (including windows, doors, and surface areas) for residential and commercial properties — including multifamily. Their 3D property intelligence product covers 94% of the U.S. population. By integrating their API, we replace or supplement on-site tape-measuring with aerial data that populates our existing building/measurement models automatically.

**The key insight:** EagleView owns measurement. We own the bid workflow. This integration connects the two — EagleView becomes a data supplier, not a competitor.

---

## EagleView API Overview

| Detail | Value |
|--------|-------|
| **Auth** | OAuth2 (Bearer token + refresh token) |
| **Token lifetime** | Access: 24 hours · Refresh: 30 days (single-use, rotated) |
| **Production endpoint** | `https://webservices.eagleview.com` (TBC on signup) |
| **Sandbox endpoint** | `https://sandbox.apicenter.eagleview.com` |
| **Test endpoint** | `https://webservices-integrations.eagleview.com` |
| **Developer portal** | https://developer.eagleview.com |
| **REST docs** | https://restdoc.eagleview.com |
| **Support** | Integrations@EagleView.com |

### Core API workflow

1. **PlaceOrder** — Submit a measurement order for an address. Key parameters:
   - `reportAddresses` — the property address
   - `primaryProductId` — the report type (e.g. WallsMeasurement, RoofMeasurement)
   - `buildingId` — target building within a complex
   - `addOnProductIds` — additional report add-ons
   - `measurementInstructionType` — what to measure
   - `referenceId` — your internal project ID for correlation
   - `comments` — special instructions
2. **OrderStatus** — Poll or receive webhook for report completion status.
3. **Order Adjustments** — Upgrade/downgrade or request re-measurement (e.g. image quality issues).
4. **Retrieve Files** — Download the completed measurement report (JSON + PDF).

### Webhook support

EagleView supports webhooks for order status notifications. Configurable via the developer portal dashboard. This avoids polling and gives us real-time notification when a report is ready.

---

## Prerequisites

Before writing code:

- [ ] **Create an EagleView developer account** at https://developer.eagleview.com
- [ ] **Apply for API access** — may require a partner agreement or commercial terms
- [ ] **Get sandbox credentials** — client ID, client secret, and initial tokens
- [ ] **Identify the right product IDs** — we need exterior wall measurements for multifamily. Confirm available `primaryProductId` values with EagleView (likely their "WallsMeasurement" or "3D Property Intelligence" product)
- [ ] **Understand pricing** — EagleView reports cost per-order ($15–$95+ depending on product). Decide who pays: pass through to contractor, bundle into subscription, or absorb
- [ ] **Review rate limits** — confirm any per-minute/per-day caps on API calls

---

## Integration Architecture

### High-level flow

```
Contractor creates project
        │
        ▼
  Enter address ──► "Pull EagleView Measurements" button
        │
        ▼
  Backend: POST PlaceOrder (address, productId, referenceId=projectId)
        │
        ▼
  EagleView processes order (minutes to hours)
        │
        ▼
  Webhook fires ──► our /api/webhooks/eagleview endpoint
        │
        ▼
  Backend: GET RetrieveReport → parse measurements
        │
        ▼
  Map EagleView data → our MeasurementSet model
        │
        ▼
  Auto-populate building measurements (contractor can review/adjust)
        │
        ▼
  Bid calculates in real time as usual
```

### Data mapping challenge

EagleView returns measurements in their schema (roof facets, wall segments, openings). We need a **mapping layer** to translate their output into our `MeasurementSet` fields:

| EagleView output | Our model field |
|------------------|----------------|
| Wall area by facade | Stucco / siding sq ft per building |
| Window count + dimensions | Window count |
| Door count + dimensions | Door count |
| Trim/fascia linear feet | Wood trim linear ft |
| Railing linear feet | Metal railing linear ft |
| Roof area (if ordered) | Roof sq ft (future use) |

**Important:** EagleView may not distinguish substrates (stucco vs. wood siding) — the contractor will likely still need to confirm material types on-site or from photos. The integration pre-fills dimensions; the contractor confirms substrate assignments.

---

## Implementation Plan

### Step 1: EagleView service module (backend)

Create `src/lib/eagleview/` with:

```
src/lib/eagleview/
├── auth.ts          # OAuth2 token management (get, refresh, store)
├── client.ts        # HTTP client wrapping EagleView API calls
├── types.ts         # TypeScript types for EV requests/responses
├── mapper.ts        # Map EV report data → our MeasurementSet
└── config.ts        # Endpoints, product IDs, env vars
```

**auth.ts** — Token management:
- Store tokens server-side (env vars for now, DB `eagleview_tokens` table later)
- Auto-refresh when access token expires (check expiry before each call)
- Handle token rotation (refresh tokens are single-use)

**client.ts** — API wrapper:
- `placeOrder(address, productId, projectId)` → returns EV order ID
- `getOrderStatus(orderId)` → returns status
- `getReport(orderId)` → returns measurement data
- All methods attach Bearer token, handle 401 → refresh → retry

**mapper.ts** — Data translation:
- `mapReportToMeasurements(evReport)` → `Partial<MeasurementSet>`
- Handle missing/null fields gracefully
- Log unmapped fields for future coverage

### Step 2: Database additions

```sql
-- Track EagleView orders linked to projects
CREATE TABLE eagleview_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  ev_order_id   TEXT NOT NULL,           -- EagleView's order ID
  ev_product_id TEXT NOT NULL,           -- product type ordered
  status        TEXT DEFAULT 'pending',  -- pending | processing | complete | failed
  report_data   JSONB,                   -- raw EV response (for debugging/remapping)
  created_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ
);
```

### Step 3: API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/eagleview/order` | POST | Place a new measurement order for a project |
| `/api/eagleview/order/[orderId]/status` | GET | Check order status (fallback if webhook is delayed) |
| `/api/webhooks/eagleview` | POST | Receive webhook when report is ready |

**Webhook handler** (`/api/webhooks/eagleview`):
1. Validate webhook signature/origin (IP allowlist or shared secret — confirm with EV docs)
2. Look up `eagleview_orders` by EV order ID
3. Fetch full report via `getReport()`
4. Run `mapReportToMeasurements()` and write to project's buildings/measurement sets
5. Update order status to `complete`
6. (Optional) Send push notification or email to contractor: "Measurements ready for [project name]"

### Step 4: UI integration

**Project detail page** — add an "EagleView Measurements" section:

- **"Order EagleView Report" button** — visible when project has an address but no EV order
- **Order status indicator** — shows pending/processing/complete with timestamp
- **Review & confirm flow** — when report arrives:
  - Show pre-filled measurements side-by-side with any manual entries
  - Contractor confirms or adjusts each value
  - "Accept Measurements" saves to MeasurementSet and triggers bid recalculation
- **Cost disclosure** — show the per-report price before ordering (since EV charges per order)

### Step 5: Error handling & edge cases

| Scenario | Handling |
|----------|----------|
| Address not found by EagleView | Show error, suggest address corrections |
| Report takes too long (>24h) | Show "still processing" + manual fallback |
| Webhook delivery fails | Polling fallback: check status every 15 min for active orders |
| Partial data (e.g. walls but no windows) | Pre-fill what's available, flag missing fields |
| Multiple buildings at one address | If EV returns per-building data, map to our building list. If not, apply measurements to the primary building and let contractor distribute |
| Token refresh fails | Alert admin, surface "reconnect EagleView" in settings |
| EV API downtime | Graceful degradation — manual entry still works as before |

---

## Environment Variables

```env
EAGLEVIEW_CLIENT_ID=
EAGLEVIEW_CLIENT_SECRET=
EAGLEVIEW_TOKEN_URL=https://...  # OAuth token endpoint
EAGLEVIEW_API_URL=https://sandbox.apicenter.eagleview.com  # switch to prod later
EAGLEVIEW_PRODUCT_ID=            # primary product ID for wall measurements
EAGLEVIEW_WEBHOOK_SECRET=        # for validating inbound webhooks
```

---

## Testing Strategy

1. **Sandbox-first** — all development against EagleView's sandbox environment with test data
2. **Mock layer** — `src/lib/eagleview/mock.ts` returns realistic fake responses for local dev/CI (avoids burning sandbox quota)
3. **Integration tests** — test the full PlaceOrder → webhook → map → save flow using the mock layer
4. **Manual QA with real sandbox** — verify against EV sandbox before production cutover
5. **Production pilot** — order a few real reports for known properties and validate accuracy against manual measurements

---

## Open Questions (to resolve with EagleView)

1. **Which product ID gives us exterior wall measurements for multifamily?** Their catalog includes multiple report types — we need the one that returns wall areas, window/door counts, and trim measurements (not just roof).
2. **Per-building breakdown?** For a multifamily complex, does the report return measurements per building, or aggregated for the whole property? This determines our mapping logic.
3. **Turnaround time?** How long from PlaceOrder to report delivery? If it's hours, the UX needs to account for async delivery. If minutes, we can make it feel more real-time.
4. **Webhook payload schema?** What data is included in the webhook notification vs. what requires a follow-up GET?
5. **Pricing tiers?** Per-report cost and whether there are volume discounts for a partner integration.
6. **Substrate identification?** Does the report distinguish exterior materials (stucco vs. wood vs. vinyl) or just geometry?

---

## Rollout Plan

| Phase | Scope | Goal |
|-------|-------|------|
| **3a** | Backend service module + sandbox testing | Prove we can order and receive reports |
| **3b** | Database + webhook handler + polling fallback | Reliable order lifecycle management |
| **3c** | UI: order button + status + review flow | Contractor-facing integration |
| **3d** | Production credentials + real report validation | Go live with paying reports |
| **3e** | Polish: cost confirmation, notification, error UX | Production-ready experience |

---

## References

- EagleView Developer Portal: https://developer.eagleview.com
- EagleView REST API Docs: https://restdoc.eagleview.com
- EagleView Measurement Orders Overview: https://developer.eagleview.com/documentation/measurement-orders/v1/overview
- EagleView API Catalog: https://developer.eagleview.com/user-guides/integrating-with-eagleview/api-catalog/measurement-orders/
- EagleView Integration Support: Integrations@EagleView.com
