"use server";

import { redirect } from "next/navigation";
import { createBid, updateBid, deleteBid } from "./store";
import { createClient } from "./supabase/server";
import {
  signInSchema,
  signUpSchema,
  createBidSchema,
  updateBidSchema,
  deleteBidSchema,
} from "./validations";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function signInAction(formData: FormData) {
  const result = signInSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/bids");
}

export async function signUpAction(formData: FormData) {
  const result = signUpSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(result.data);

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Check your email to confirm your account");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createBidAction(formData: FormData) {
  const result = createBidSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/bids/new?error=${encodeURIComponent(message)}`);
  }

  const bid = await createBid(result.data);
  redirect(`/bids/${bid.id}`);
}

export async function updateBidAction(formData: FormData) {
  const result = updateBidSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    const id = formData.get("id") as string;
    redirect(`/bids/${id}?error=${encodeURIComponent(message)}`);
  }

  const { id, ...data } = result.data;
  await updateBid(id, data);
  redirect(`/bids/${id}`);
}

export async function deleteBidAction(formData: FormData) {
  const result = deleteBidSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    redirect("/bids");
  }

  await deleteBid(result.data.id);
  redirect("/bids");
}
