"use client";

/**
 * Client-side handoff for AI lead intake (Jordan D1): the Home composer
 * extracts a draft from a dropped spec/email, stashes it here, and routes to
 * /leads/new, where the form hydrates from it. The JSON draft rides
 * sessionStorage; the dropped File objects can't be serialized, so they ride
 * this module (which survives SPA navigation) and are re-injected into the
 * form's file input on mount.
 */

export type ExtractedLeadDraft = {
  projectName: string | null;
  propertyName: string | null;
  propertyAddress: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
  /** Scope chips it recognized (subset of the form's chips). */
  scope: string[];
  /** Short summary of the work's specifics — lands in notes. */
  scopeSummary: string | null;
  isLargeJob: boolean | null;
};

const KEY = "mercer:lead-draft";

/** Dropped files, held across the client-side navigation to /leads/new. */
export const pendingLeadFiles: { files: File[] } = { files: [] };

export function stashLeadDraft(draft: ExtractedLeadDraft, files: File[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage full/blocked — the files still ride along.
  }
  pendingLeadFiles.files = files;
}

/** Read-and-clear: the draft feeds exactly one form mount. */
export function takeLeadDraft(): {
  draft: ExtractedLeadDraft | null;
  files: File[];
} {
  let draft: ExtractedLeadDraft | null = null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      draft = JSON.parse(raw) as ExtractedLeadDraft;
      sessionStorage.removeItem(KEY);
    }
  } catch {
    draft = null;
  }
  const files = pendingLeadFiles.files;
  pendingLeadFiles.files = [];
  return { draft, files };
}
