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
  address: z.string().min(1, "Address is required"),
  clientName: z.string().min(1, "Client name is required"),
  notes: z.string().default(""),
});

export const updateBidSchema = z.object({
  id: z.string().uuid("Invalid bid ID"),
  address: z.string().min(1, "Address is required"),
  clientName: z.string().min(1, "Client name is required"),
  notes: z.string().default(""),
  status: bidStatusEnum,
});

export const deleteBidSchema = z.object({
  id: z.string().uuid("Invalid bid ID"),
});
