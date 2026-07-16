"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createOrgKnowledgeFile,
  deleteOrgKnowledgeFile,
} from "@/lib/store";
import { ORG_KNOWLEDGE_KINDS } from "@/db/schema";

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const PAGE = "/settings/knowledge";

/**
 * Upload raw org knowledge files (the claude.ai "project knowledge"
 * equivalent): pricing spreadsheets, supplier sheets, sample proposals,
 * messaging guides. Stored as-is; proposal/budget generation reads them
 * verbatim — no structured data entry.
 */
export async function uploadOrgKnowledgeAction(formData: FormData) {
  const kindRaw = (formData.get("kind") as string) || "other";
  const kind = (ORG_KNOWLEDGE_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as (typeof ORG_KNOWLEDGE_KINDS)[number])
    : "other";
  const notes = ((formData.get("notes") as string) || "").trim();
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    redirect(`${PAGE}?error=${encodeURIComponent("Pick a file to upload")}`);
  }
  try {
    const supabase = await createClient();
    for (const file of files) {
      if (!MIME_TYPES.has(file.type)) {
        throw new Error(
          `Unsupported file type for "${file.name}" — use PDF, spreadsheet, Word, image, CSV, or text`,
        );
      }
      if (file.size > MAX_BYTES) {
        throw new Error(`"${file.name}" is over 10 MB`);
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const storagePath = `org-knowledge/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(storagePath);
      await createOrgKnowledgeFile({
        kind,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath,
        url: urlData.publicUrl,
        notes,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(PAGE);
}

export async function deleteOrgKnowledgeAction(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  if (!id) return;
  try {
    const row = await deleteOrgKnowledgeFile(id);
    if (row) {
      const supabase = await createClient();
      await supabase.storage.from("attachments").remove([row.storagePath]);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete file";
    redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(PAGE);
}
