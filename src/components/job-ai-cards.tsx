"use client";

import { useState, useTransition } from "react";
import { FileCheck2, Loader2, Sparkles } from "lucide-react";
import {
  generateAdditionalWorkAction,
  generateSiteReportAction,
  generateCloseoutAction,
} from "@/lib/actions/job-ai";
import { Button } from "@/components/ui/button";

/**
 * The AI keeps working after the sale (plan C2–C4) — same interaction
 * grammar as the composer: a sentence (plus the job's photos, already on
 * file) in, a document out. Drafts only; the PM reviews everything.
 */

function AiComposerRow({
  placeholder,
  cta,
  busyCta,
  onGenerate,
}: {
  placeholder: string;
  cta: string;
  busyCta: string;
  onGenerate: (note: string) => Promise<string | null>;
}) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "error"; text: string } | { kind: "done"; text: string }
  >({ kind: "idle" });

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/20 p-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="min-h-14 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground/30"
      />
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !note.trim()}
          onClick={() =>
            start(async () => {
              setStatus({ kind: "idle" });
              const error = await onGenerate(note.trim());
              if (error) setStatus({ kind: "error", text: error });
              else {
                setNote("");
                setStatus({ kind: "done", text: "Drafted — review it below." });
              }
            })
          }
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {pending ? busyCta : cta}
        </Button>
        {status.kind === "error" && (
          <span className="text-xs text-destructive">{status.text}</span>
        )}
        {status.kind === "done" && (
          <span className="text-xs font-medium text-emerald-600">
            {status.text}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Uses the photos already on this job. Nothing is sent until you review.
      </p>
    </div>
  );
}

/** C3 — photos + a note → an Additional Work draft at the published rates. */
export function AdditionalWorkComposer({ bidId }: { bidId: string }) {
  return (
    <AiComposerRow
      placeholder='What did the crew find? e.g. "Rot on building 4 rafter tails, about 60 LF of 2x6, plus one stucco crack by the pool gate"'
      cta="Price it at published rates"
      busyCta="Pricing…"
      onGenerate={async (note) => {
        const result = await generateAdditionalWorkAction({ bidId, note });
        return result.ok ? null : result.error;
      }}
    />
  );
}

/** C2 — photos + a note → the customer-ready weekly report. */
export function SiteReportComposer({ bidId }: { bidId: string }) {
  return (
    <AiComposerRow
      placeholder='Rough notes are fine — e.g. "finished buildings 3 and 4, pressure washed 5-6, starting trim Monday, one sprinkler head replaced"'
      cta="Draft the weekly report"
      busyCta="Drafting…"
      onGenerate={async (note) => {
        const result = await generateSiteReportAction({ bidId, note });
        return result.ok ? null : result.error;
      }}
    />
  );
}

/** C4 — one button at completion: the closeout packet. */
export function CloseoutButton({ bidId }: { bidId: string }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "error"; text: string } | { kind: "done" }
  >({ kind: "idle" });
  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setStatus({ kind: "idle" });
            const result = await generateCloseoutAction({ bidId });
            setStatus(
              result.ok ? { kind: "done" } : { kind: "error", text: result.error },
            );
          })
        }
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FileCheck2 className="size-3.5" />
        )}
        {pending ? "Assembling…" : "Generate closeout packet"}
      </Button>
      {status.kind === "error" && (
        <span className="text-xs text-destructive">{status.text}</span>
      )}
      {status.kind === "done" && (
        <span className="text-xs font-medium text-emerald-600">
          Posted to updates — visible on the customer link.
        </span>
      )}
    </div>
  );
}
