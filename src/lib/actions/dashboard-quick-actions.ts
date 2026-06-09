"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/lib/org-context";
import {
  createContact,
  createLead,
  logLeadContact,
  setLeadFollowUp,
} from "@/lib/store";

// Result-returning quick-create actions for the dashboard composer / action
// pills. Unlike the page-form actions in src/lib/actions.ts (which redirect on
// success), these return a plain result so the slide-over Sheet can stay open
// and render inline success/error without navigating away.
//
// NOTE on log-call / set-follow-up: in the current schema these are
// lead-scoped (a follow-up is a column on `leads`; activity events hang off a
// lead). With no entity-resolution step yet, both create a lead to attach to.
// The real follow-up is to resolve free text to an EXISTING lead/contact first
// and only create when there's no match. Flagged in docs/memory.

export type QuickResult = { ok: true } | { ok: false; error: string };

function clean(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}

const SOURCE_TAG = "dashboard";

export async function quickAddContact(input: {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
}): Promise<QuickResult> {
  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, error: "You're not signed in." };

  const name = clean(input.name);
  if (!name) return { ok: false, error: "A name is required." };

  try {
    await createContact({
      name,
      company: clean(input.company),
      email: clean(input.email),
      phone: clean(input.phone),
      sourceTag: SOURCE_TAG,
    });
    revalidatePath("/contacts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

export async function quickCreateLead(input: {
  propertyAddress?: string;
  primaryContact?: string;
  source?: string;
}): Promise<QuickResult> {
  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, error: "You're not signed in." };

  // createLead requires a name (it findOrCreates a contact from it). Prefer the
  // primary contact; fall back to the address so an address-only lead still
  // lands. (Property-only leads with no contact need a store change — TODO.)
  const name = clean(input.primaryContact) ?? clean(input.propertyAddress);
  if (!name) {
    return {
      ok: false,
      error: "Add a primary contact or a property address.",
    };
  }

  try {
    const address = clean(input.propertyAddress);
    await createLead({
      name,
      propertyName: address,
      resolvedAddress: address,
      sourceTag: clean(input.source) ?? SOURCE_TAG,
    });
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

export async function quickLogCall(input: {
  contact?: string;
  outcome?: string;
  notes?: string;
}): Promise<QuickResult> {
  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, error: "You're not signed in." };

  const name = clean(input.contact);
  if (!name) return { ok: false, error: "Who did you call?" };

  try {
    const outcome = clean(input.outcome);
    const notes = clean(input.notes);
    const noteParts = [outcome ? `Outcome: ${outcome}` : null, notes].filter(
      Boolean,
    );
    const lead = await createLead({
      name,
      notes: noteParts.join("\n"),
      sourceTag: SOURCE_TAG,
    });
    // Increment the attempt counter + write the "call" activity event.
    await logLeadContact(lead.id);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

export async function quickSetFollowUp(input: {
  about?: string;
  dueDate?: string;
  note?: string;
}): Promise<QuickResult> {
  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, error: "You're not signed in." };

  const name = clean(input.about);
  if (!name) return { ok: false, error: "Who or what is the follow-up about?" };

  const dueDate = clean(input.dueDate);
  if (!dueDate) return { ok: false, error: "Pick a due date." };

  try {
    const lead = await createLead({
      name,
      notes: clean(input.note) ?? "",
      sourceTag: SOURCE_TAG,
    });
    await setLeadFollowUp(lead.id, dueDate);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}
