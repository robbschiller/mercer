"use client";

import { useState, useTransition } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import { createProposalShareAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

/** Copies the version's live customer link (agenda "Resend link" action). */
export function CopyShareLinkButton({
  proposalId,
  label = "Copy link",
  className,
}: {
  proposalId: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, start] = useTransition();

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => {
          const result = await createProposalShareAction({ proposalId });
          if (!result.shareUrl) return;
          try {
            await navigator.clipboard.writeText(result.shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("Copy the customer link:", result.shareUrl);
          }
        })
      }
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-foreground hover:text-background",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : copied ? (
        <Check className="size-3.5" />
      ) : (
        <Link2 className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
