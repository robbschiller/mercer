import { z } from "zod";
import {
  BID_STATUSES,
  LEAD_STATUSES,
  PROJECT_STATUSES,
} from "./status-meta";

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
}, z.union([z.string().uuid("Invalid lead ID"), z.null()]));

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
  propertyName: optionalText,
  notes: z
    .union([z.string(), z.undefined()])
    .transform((v) => (v ?? "").trim()),
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
