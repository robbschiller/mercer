import { z } from "zod";

// Schema + constants + types for the dashboard composer's intent parsing.
// These live OUTSIDE the `"use server"` action module on purpose: a server
// action file may only export async functions, so the Zod schema and the
// kinds array (both runtime objects) cannot be exported from there.
// `parse-dashboard-intent.ts` imports from here.

export const DASHBOARD_INTENT_KINDS = [
  "add-contact",
  "create-lead",
  "log-call",
  "set-follow-up",
  "start-draft-bid",
  "show-overdue",
  "unknown",
] as const;

export type DashboardIntentKind = (typeof DASHBOARD_INTENT_KINDS)[number];

// Flat schema with nullable fields — only the ones relevant to `kind` get
// populated. Discriminated unions over `kind` are harder to land cleanly
// through structured outputs, and the project's prior Claude usage
// (src/lib/onboarding/enrich-from-website.ts) follows this same shape.
export const DashboardIntentSchema = z.object({
  kind: z.enum(DASHBOARD_INTENT_KINDS),
  confidence: z.enum(["high", "medium", "low"]),
  // One-line, friendly explanation. For `unknown`, this is what to show
  // the user; for the action kinds, it's an optional summary like
  // "Add Sarah Chen at Highmark Properties".
  summary: z.string().nullable(),

  // Fields. Each one is null when not applicable to the chosen kind, or
  // when the user didn't mention it.
  name: z.string().nullable(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),

  propertyAddress: z.string().nullable(),
  primaryContact: z.string().nullable(),
  source: z.string().nullable(),

  contact: z.string().nullable(),
  outcome: z.string().nullable(),
  notes: z.string().nullable(),

  about: z.string().nullable(),
  // ISO YYYY-MM-DD when resolvable; null otherwise.
  dueDate: z.string().nullable(),
  note: z.string().nullable(),

  scopeSummary: z.string().nullable(),
  sourceTag: z.string().nullable(),
});

export type DashboardIntent = z.infer<typeof DashboardIntentSchema>;
