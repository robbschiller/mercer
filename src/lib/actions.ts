"use server";

import { redirect } from "next/navigation";
import { createBid, updateBid, deleteBid } from "./store";
import { createClient } from "./supabase/server";

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/bids");
}

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

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
  const address = formData.get("address") as string;
  const clientName = formData.get("clientName") as string;
  const notes = (formData.get("notes") as string) || "";

  if (!address || !clientName) {
    throw new Error("Address and client name are required");
  }

  const bid = await createBid({
    address,
    clientName,
    notes,
  });
  redirect(`/bids/${bid.id}`);
}

export async function updateBidAction(formData: FormData) {
  const id = formData.get("id") as string;
  const address = formData.get("address") as string;
  const clientName = formData.get("clientName") as string;
  const notes = (formData.get("notes") as string) || "";
  const status = formData.get("status") as string;

  if (!id || !address || !clientName) {
    throw new Error("Missing required fields");
  }

  await updateBid(id, {
    address,
    clientName,
    notes,
    status: status as "draft" | "sent" | "won" | "lost",
  });

  redirect(`/bids/${id}`);
}

export async function deleteBidAction(formData: FormData) {
  const id = formData.get("id") as string;
  await deleteBid(id);
  redirect("/bids");
}
