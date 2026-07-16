# AQP Operating System — Data Model & Build Notes

Prepared by Jordan for the engineering team. This covers the core object structure, fields, relationships, AI features, and workflows for the AQP operating system.

---

## 1. Object Hierarchy Overview

```
ACCOUNT (top level — the management company, e.g. Highmark)
   ├── PROPERTY (many properties per account)
   │      ├── LEAD (leads anchor to property, not contact)
   │      ├── OPPORTUNITY (multiple opportunities stack under a property over time)
   │      │      └── JOB (created when an opportunity is won/approved)
   │      └── CONTACT (linked; a contact can manage 1 to 20+ properties)
```

Key relationship rules:
- Multiple Properties link to a single Account (required relationship)
- Opportunities nest under Property, but also reference Account and Contact
- Leads are anchored to Property. A lead does NOT require a contact to exist first. Example: a Sherwin-Williams rep sends over a maintenance supervisor's card for a property looking for quotes — the lead lives on the property, with the contact linked when available.
- When an Opportunity is approved by the customer (online approval or signed), it converts to a Job.

---

## 2. Account Object

Keep this intentionally simple — it's a container.

**Fields:**
- Account name (e.g., Highmark)
- Address
- Basic company info

**Related records (clickable lists, not just counts):**
- All Properties they manage
- All open Opportunities
- All Contacts

Note: Billing/invoicing is handled at the Job/Property level, NOT the Account level.

---

## 3. Property Object

**Fields:**
- Property name
- Address
- Property type (multifamily, condo HOA, commercial, etc.)
- Owner info / owner history
- Total attainable square feet — non-floor surfaces
- Total attainable square feet — floors
- Number of breezeways
- Number of stair systems
- Primary contact (who manages this property)
- Maintenance history / known issues (things crews should know before arriving)

**Photo section:** upload area for property photos.

**Related records (must be clickable — e.g., click "25 Open Opportunities" and drill into each record):**
- All Opportunities at this property
- All Jobs completed at this property

---

## 4. Contact Object

**Fields:**
- First name, last name
- Email, phone
- Title
- Company (account association)
- Preferred communication method (email / phone / text)
- Notes

**Rollup fields:**
- Number of properties this contact manages (a PM may manage 1; a regional manager may manage 16–20)
- Total lifetime amount awarded to AQP by this contact

---

## 5. Lead Object

Leads anchor to Property (see hierarchy rules above).

**Fields:**
- First name, last name
- Email, phone
- Lead source (referral, Sherwin-Williams rep, website, cold call, etc.)
- Record type: Large Job / Small Job
- Estimated amount
- Date received
- Status (new, contacted, qualified, converted)
- Property (lookup)
- Account (lookup)
- Contact (lookup — optional, lead can exist without one)

---

## 6. Opportunity Object

**Fields:**
- Record type: Large Job / Small Job
- Total amount
- Duration (how long the job will take)
- Status (proposal, won, lost, in progress, completed)
- Expected start / close date
- Assigned to (team member)
- Estimated gross profit
- Scope description / notes
- Property (lookup — pulls property data like square footage)
- Account (lookup)
- Contact (lookup)

**Cost fields by record type:**
- Small Job: estimated labor cost, estimated material cost
- Large Job: detailed breakdown — total paint cost, caulking quantity, Airbnb/housing (if needed), staging costs, etc. Jordan will send a spreadsheet with the full large-job breakdown structure.

**Photo section (large/robust):** Photos here are a primary AI input — AI uses them to help build pricing and scope of work.

**AI quote workflow:**
1. Salesperson uses a scope input area (button/form) on the opportunity to feed in scope details
2. AI generates the quote referencing the photos, scope input, and the AQP price lists
3. Generated PDF quote appears on the opportunity (file + shareable link) to send to the customer

**PDF consistency requirement:** The AI-generated PDF must follow the same format every single time. Templated, consistent output — not freeform.

**Pricing reference:** Jordan will provide price structure lists the AI must use:
- Large job price list
- Itemized price lists for wood rot repair, stucco repair, stair systems, railings, etc.

**Quote versioning:**
- Version number field that increments each time a new quote is generated (v1, v2, v3...)
- Change log field tracking what changed between versions (e.g., "v2: removed stucco repair, adjusted timeline")

**Conversion:** When the customer approves (online or signed), the Opportunity converts to a Job.

---

## 7. Job Object

Created from a won Opportunity. Budget clones over from the opportunity.

**Fields:**
- Budget (cloned from opportunity)
- Total contracted amount
- Job status (not started, in progress, on hold, completed)
- Assigned PM
- Actual start / end dates
- Estimated days to complete + days remaining to completion date (simple schedule view)
- Link back to originating Opportunity (traceability)
- Invoicing contact (so AP knows who to bill)
- Job notes

**Related objects on Job:**

### 7a. Crew Assignment
- Which crew/sub is assigned to the job

### 7b. Weekly Site Updates
- PM takes photos on-site + records a short voice note
- AI automatically generates the weekly site report from those inputs
- Report is sent to the customer automatically

### 7c. Additional Work (do NOT call these "change orders" — AQP does not do change orders, only additional work)
- Nearly identical flow to weekly site updates
- PM uploads photos and explains the scope on the record
- AI generates a quote within minutes to send to the customer

### 7d. Job Expenses (live budget tracking)
- Each expense is a record with: type, amount, date
- Expense record types: Labor, Materials, Housing, Mobilization (plus room for more categories)
- Expenses deduct against budget in real time — live remaining-budget view on the job

### 7e. Invoicing / Draws
- Track each draw against total contracted amount (Draw 1, Draw 2, Draw 3...)
- Each draw record: amount, date sent, paid status
- Full payment timeline visible against contract value

**Closeout packet:**
- Button at job completion that generates a closeout packet for the customer:
  - Confirmation job is completed
  - Colors used + where each color goes on the property
  - Care instructions for the property
  - Etc.

---

## 8. AI Features Summary (for engineering scoping)

| Feature | Input | Output |
|---|---|---|
| Quote generation (Opportunity) | Photos + salesperson scope input + AQP price lists | Consistent, templated PDF quote with shareable link |
| Weekly site reports (Job) | PM photos + voice note | Auto-generated report sent to customer |
| Additional work quotes (Job) | PM photos + scope explanation | Quote generated within minutes |
| Closeout packet (Job) | Job data (colors, scope, property) | Customer-facing closeout document |

**Assets Jordan will provide:**
- Large job cost breakdown spreadsheet
- Large job price list
- Itemized price lists (wood rot, stucco, stair systems, railings)

---

## 9. Open Items / To Confirm Later
- Naming for "total attainable square feet — non-floor surfaces" field
- Additional expense categories beyond Labor / Materials / Housing / Mobilization
- Any additional fields that surface once the team starts building
