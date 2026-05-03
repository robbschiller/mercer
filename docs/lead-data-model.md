# Lead data model

Mercer treats a lead as a property-level sales opportunity. Contacts,
properties, and accounts are durable records that can be reused across many
opportunities; the lead is the current or historical pursuit for one property.

## Core entities

- `accounts`: management companies, owners, or portfolio organizations.
- `properties`: physical assets with address, location, enrichment, and account links.
- `contacts`: people with name, email, phone, title, source, and optional relationship tier.
- `property_contacts`: many-to-many contact/property relationships with role, source, provenance, and active state.
- `leads`: repeatable opportunities for one property, with compatibility contact/property fields kept during migration.
- `lead_contacts`: contacts involved in a specific opportunity, including the primary contact.
- `bids`: one bid per property; bids can link to the originating lead and primary contact.

## Activity and audit

Sales history and operational notes live in `activity_events`. The default
attachment is `lead_id`, with optional links to contact, property, account, or
bid.

Structured data changes live in `audit_log`. Core create/update paths write the
entity type, entity id, action, changed fields, previous values, new values,
actor, source, and timestamp.

## Migration posture

This model is additive. Existing flat `leads` fields remain readable while the
app migrates screen by screen. The `013_lead_domain_model.sql` migration
backfills accounts, properties, contacts, relationship rows, lead-contact links,
timeline events, bid property links, and audit records from existing lead data.

## Product rules

- A lead should represent one property opportunity.
- A property can have many contacts.
- A contact can be linked to many properties.
- A property can have multiple leads over time.
- A bid must point at one property, and may also point at the active lead.
- Important contacts are identified from portfolio breadth plus optional manual relationship tier.
