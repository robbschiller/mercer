import { z } from "zod";
import {
  BID_STATUSES,
  LEAD_STATUSES,
  PROJECT_STATUSES,
  BUILDING_ARCHETYPES,
  ACCESS_TYPES,
  EXPENSE_CATEGORIES,
  PAYMENT_TYPES,
  INVOICE_TYPES,
  INVOICE_STATUSES,
  CHANGE_ORDER_REASONS,
  CHANGE_ORDER_STATUSES,
} from "./status-meta";

/** Form select → archetype enum, with empty string / missing → null. */
const archetypeField = z.preprocess(
  (val: unknown) => (val === "" || val == null ? null : val),
  z.union([z.enum(BUILDING_ARCHETYPES), z.null()]),
);

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const bidStatusEnum = z.enum(BID_STATUSES);

/** Empty / missing → null so updates clear coords; valid number → number. */
const formLatLng = z.preprocess((val: unknown) => {
  if (val === "" || val === undefined || val === null) return null;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : null;
}, z.union([z.number().finite(), z.null()]));

const formPlaceId = z.preprocess((val: unknown) => {
  if (val === "" || val === undefined || val === null) return null;
  return String(val);
}, z.union([z.string().min(1), z.null()]));

const formOptionalUuid = z.preprocess((val: unknown) => {
  if (val === "" || val === undefined || val === null) return null;
  return String(val);
}, z.union([z.string().uuid("Invalid ID"), z.null()]));

export const createBidSchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  clientName: z.string().min(1, "Client name is required"),
  notes: z.string().default(""),
  latitude: formLatLng,
  longitude: formLatLng,
  googlePlaceId: formPlaceId,
  leadId: formOptionalUuid,
});

export const updateBidSchema = z.object({
  id: z.string().uuid("Invalid bid ID"),
  propertyName: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  clientName: z.string().min(1, "Client name is required"),
  notes: z.string().default(""),
  status: bidStatusEnum,
  latitude: formLatLng,
  longitude: formLatLng,
  googlePlaceId: formPlaceId,
});

export const deleteBidSchema = z.object({
  id: z.string().uuid("Invalid bid ID"),
});

// ── Buildings ──

export const createBuildingSchema = z.object({
  bidId: z.string().uuid("Invalid bid ID"),
  label: z.string().min(1, "Label is required"),
  count: z.coerce.number().int().min(1, "Count must be at least 1").default(1),
});

export const updateBuildingSchema = z.object({
  id: z.string().uuid("Invalid building ID"),
  label: z.string().min(1, "Label is required"),
  count: z.coerce.number().int().min(1, "Count must be at least 1"),
  archetype: archetypeField.optional(),
});

export const deleteBuildingSchema = z.object({
  id: z.string().uuid("Invalid building ID"),
  bidId: z.string().uuid("Invalid bid ID"),
});

// ── Surfaces ──

const dimensionGroup = z.array(z.number().positive());

export const createSurfaceSchema = z.object({
  buildingId: z.string().uuid("Invalid building ID"),
  bidId: z.string().uuid("Invalid bid ID"),
  name: z.string().min(1, "Surface name is required"),
  dimensions: z.array(dimensionGroup).min(1, "At least one dimension group is required"),
});

export const updateSurfaceSchema = z.object({
  id: z.string().uuid("Invalid surface ID"),
  bidId: z.string().uuid("Invalid bid ID"),
  name: z.string().min(1, "Surface name is required"),
  dimensions: z.array(dimensionGroup).min(1, "At least one dimension group is required"),
});

export const deleteSurfaceSchema = z.object({
  id: z.string().uuid("Invalid surface ID"),
  bidId: z.string().uuid("Invalid bid ID"),
});

// ── Pricing ──

const optionalNumeric = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => {
    if (v === null || v === "" || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : String(n);
  });

export const updateBidPricingSchema = z.object({
  id: z.string().uuid("Invalid bid ID"),
  coverageSqftPerGallon: optionalNumeric,
  pricePerGallon: optionalNumeric,
  laborRatePerUnit: optionalNumeric,
  marginPercent: optionalNumeric,
});

// ── Line Items ──

export const createLineItemSchema = z.object({
  bidId: z.string().uuid("Invalid bid ID"),
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number({ message: "Amount must be a number" }).transform(String),
});

export const updateLineItemSchema = z.object({
  id: z.string().uuid("Invalid line item ID"),
  bidId: z.string().uuid("Invalid bid ID"),
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number({ message: "Amount must be a number" }).transform(String),
});

export const deleteLineItemSchema = z.object({
  id: z.string().uuid("Invalid line item ID"),
  bidId: z.string().uuid("Invalid bid ID"),
});

// ── User Defaults ──

export const updateUserDefaultsSchema = z.object({
  coverageSqftPerGallon: optionalNumeric,
  pricePerGallon: optionalNumeric,
  laborRatePerUnit: optionalNumeric,
  marginPercent: optionalNumeric,
});

// ── Proposals ──

export const generateProposalSchema = z.object({
  bidId: z.string().uuid("Invalid bid ID"),
});

export const createProposalShareSchema = z.object({
  proposalId: z.string().uuid("Invalid proposal ID"),
});

export const acceptProposalShareSchema = z.object({
  slug: z.string().uuid("Invalid share link"),
  acceptedByName: z.string().trim().min(1, "Name is required"),
  acceptedByTitle: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
      if (v == null) return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    }),
});

export const declineProposalShareSchema = z.object({
  slug: z.string().uuid("Invalid share link"),
  reason: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
      if (v == null) return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    }),
});

// ── Leads ──

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  });

const optionalEmail = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null ? "" : v.trim()))
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Invalid email address",
  })
  .transform((v) => (v === "" ? null : v));

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sourceTag: optionalText,
  email: optionalEmail,
  phone: optionalText,
  company: optionalText,
  accountId: formOptionalUuid,
  propertyName: optionalText,
  resolvedAddress: optionalText,
  notes: z
    .union([z.string(), z.undefined()])
    .transform((v) => (v ?? "").trim()),
  isLargeJob: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  estValue: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.union([z.number().finite(), z.null()]),
    )
    .transform((v) => (v == null ? null : String(v))),
  scopeCategory: z.preprocess(
    (v) => {
      if (typeof v !== "string") return null;
      const arr = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return arr.length ? arr : null;
    },
    z.union([z.array(z.string()), z.null()]),
  ),
});

export const createContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  title: optionalText,
  email: optionalEmail,
  phone: optionalText,
  company: optionalText,
  accountId: formOptionalUuid,
  sourceTag: optionalText,
  notes: z
    .union([z.string(), z.undefined()])
    .transform((v) => (v ?? "").trim()),
});

// ── Money layer (AQP reconciliation, Phase 1) ──
export const createExpenseSchema = z.object({
  bidId: z.string().uuid("Invalid project ID"),
  date: z.string().min(1, "Date is required"),
  category: z.enum(EXPENSE_CATEGORIES),
  paymentType: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.union([z.enum(PAYMENT_TYPES), z.null()]),
  ),
  vendor: optionalText,
  description: optionalText,
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .finite("Amount must be a number"),
  tax: z.coerce.number().finite().default(0),
  invoiceNumber: optionalText,
});

export const deleteExpenseSchema = z.object({
  id: z.string().uuid("Invalid expense ID"),
  bidId: z.string().uuid("Invalid project ID"),
});

// ── Money layer Phase 1b: invoices + change orders ──
export const createInvoiceSchema = z.object({
  bidId: z.string().uuid("Invalid project ID"),
  type: z.enum(INVOICE_TYPES),
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .finite("Amount must be a number"),
  sequence: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.union([z.coerce.number().int(), z.null()]),
  ),
  trigger: optionalText,
  dueAt: optionalText,
});

export const setInvoiceStatusSchema = z.object({
  id: z.string().uuid("Invalid invoice ID"),
  bidId: z.string().uuid("Invalid project ID"),
  status: z.enum(INVOICE_STATUSES),
});

export const deleteInvoiceSchema = z.object({
  id: z.string().uuid("Invalid invoice ID"),
  bidId: z.string().uuid("Invalid project ID"),
});

export const createChangeOrderSchema = z.object({
  bidId: z.string().uuid("Invalid project ID"),
  description: z.string().trim().min(1, "Description is required"),
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .finite("Amount must be a number"),
  reason: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.union([z.enum(CHANGE_ORDER_REASONS), z.null()]),
  ),
  detail: optionalText,
});

export const setChangeOrderStatusSchema = z.object({
  id: z.string().uuid("Invalid change order ID"),
  bidId: z.string().uuid("Invalid project ID"),
  status: z.enum(CHANGE_ORDER_STATUSES),
});

export const deleteChangeOrderSchema = z.object({
  id: z.string().uuid("Invalid change order ID"),
  bidId: z.string().uuid("Invalid project ID"),
});

export const importLeadsSchema = z.object({
  sourceTag: optionalText,
});

export const updateLeadStatusSchema = z.object({
  id: z.string().uuid("Invalid lead ID"),
  status: z.enum(LEAD_STATUSES),
});

export const updateLeadSchema = z.object({
  id: z.string().uuid("Invalid lead ID"),
  name: z.string().trim().min(1, "Name is required"),
  email: optionalEmail,
  phone: optionalText,
  company: optionalText,
  propertyName: optionalText,
  resolvedAddress: optionalText,
  notes: z
    .union([z.string(), z.undefined()])
    .transform((v) => (v ?? "").trim()),
});

export const enrichLeadActionSchema = z.object({
  id: z.string().uuid("Invalid lead ID"),
});

export const logLeadContactSchema = z.object({
  id: z.string().uuid("Invalid lead ID"),
});

export const setLeadFollowUpSchema = z.object({
  id: z.string().uuid("Invalid lead ID"),
  followUpAt: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Date must be YYYY-MM-DD",
    }),
});

// ── Projects ──

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Date must be YYYY-MM-DD",
  });

export const updateProjectStatusSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  status: z.enum(PROJECT_STATUSES),
});

export const updateProjectDetailsSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  targetStartDate: optionalDate,
  targetEndDate: optionalDate,
  assignedSub: optionalText,
  crewLeadName: optionalText,
  notes: z
    .union([z.string(), z.undefined()])
    .transform((v) => (v ?? "").trim()),
});

/**
 * HTML checkboxes only appear in FormData when checked, so any defined
 * value (typically the literal string "on") is true. This shape works
 * for both server actions parsing FormData and JSON callers.
 */
const formCheckbox = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === "") return false;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const lowered = val.toLowerCase();
    return lowered === "on" || lowered === "true" || lowered === "1";
  }
  return Boolean(val);
}, z.boolean());

export const createProjectUpdateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  body: z
    .string()
    .trim()
    .min(1, "Write something in the update")
    .max(4000, "Update is too long"),
  visibleOnPublicUrl: formCheckbox,
});

// ── Onboarding ──

/**
 * Permissive URL coerce: accepts "example.com" by prepending https:// before
 * validating, since contractors will type it without a scheme.
 */
const websiteUrl = z
  .string()
  .trim()
  .min(1, "Enter your company website")
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return u.hostname.includes(".");
      } catch {
        return false;
      }
    },
    { message: "Enter a valid website URL" }
  );

const optionalHexColor = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine((v) => v === null || /^#[0-9a-fA-F]{6}$/.test(v), {
    message: "Color must be a 6-digit hex like #1A2B3C",
  });

export const submitWebsiteSchema = z.object({
  websiteUrl,
});

export const confirmCompanyProfileSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  street: optionalText,
  city: optionalText,
  state: optionalText,
  zip: optionalText,
  phone: optionalText,
  email: optionalText,
});

export const confirmThemeSchema = z.object({
  primaryColor: optionalHexColor,
});

export const updateCompanyProfileSchema = z.object({
  websiteUrl: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
      if (v == null) return null;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    }),
  companyName: z.string().trim().min(1, "Company name is required"),
  tagline: optionalText,
  street: optionalText,
  city: optionalText,
  state: optionalText,
  zip: optionalText,
  phone: optionalText,
  email: optionalText,
  logoUrl: optionalText,
  primaryColor: optionalHexColor,
  accentColor: optionalHexColor,
  bodyFont: optionalText,
});

export const inviteOrgMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(["admin", "member"]).default("member"),
});

export const removeOrgMemberSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
});

const nullableContactId = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === "") return null;
  return String(val);
}, z.union([z.string().uuid("Invalid contact ID"), z.null()]));

export const setPropertyOwnerContactSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  contactId: nullableContactId,
});

export const setProjectNtoSchema = z.object({
  bidId: z.string().uuid("Invalid project ID"),
  legalOwnerName: optionalText,
  legalOwnerAddress: optionalText,
  ntoContactId: nullableContactId,
});

// ── Access items ──

const optionalNumericString = z.preprocess(
  (val: unknown) => (val === "" || val == null ? null : val),
  z.union([z.coerce.number().transform(String), z.null()]),
);

const optionalInt = z.preprocess(
  (val: unknown) => (val === "" || val == null ? null : val),
  z.union([z.coerce.number().int(), z.null()]),
);

export const createAccessItemSchema = z.object({
  bidId: z.string().uuid("Invalid bid ID"),
  type: z.enum(ACCESS_TYPES),
  method: optionalText,
  quantity: optionalNumericString,
  durationDays: optionalInt,
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .transform(String),
});

export const updateAccessItemSchema = z.object({
  id: z.string().uuid("Invalid access item ID"),
  bidId: z.string().uuid("Invalid bid ID"),
  type: z.enum(ACCESS_TYPES),
  method: optionalText,
  quantity: optionalNumericString,
  durationDays: optionalInt,
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .transform(String),
});

export const deleteAccessItemSchema = z.object({
  id: z.string().uuid("Invalid access item ID"),
  bidId: z.string().uuid("Invalid bid ID"),
});
