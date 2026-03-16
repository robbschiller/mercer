import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const bidStatusEnum = z.enum(["draft", "sent", "won", "lost"]);

export const createBidSchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  clientName: z.string().min(1, "Client name is required"),
  notes: z.string().default(""),
});

export const updateBidSchema = z.object({
  id: z.string().uuid("Invalid bid ID"),
  propertyName: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  clientName: z.string().min(1, "Client name is required"),
  notes: z.string().default(""),
  status: bidStatusEnum,
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
