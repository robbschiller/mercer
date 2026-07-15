"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  draftFollowUpAction,
  logFollowUpCopiedAction,
} from "@/lib/actions/draft-follow-up";

/** Pipeline "Next" action for sent quotes: draft the chase message. */
export function FollowUpNudge({ bidId }: { bidId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, start] = useTransition();

  const draft = () => {
    if (text || busy) return;
    start(async () => {
      const result = await draftFollowUpAction({ bidId });
      if (result.text) setText(result.text);
      else setError(result.error ?? "Draft failed");
    });
  };

  return (
    <Popover onOpenChange={(open) => open && draft()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          <Sparkles className="size-3.5" />
          Draft follow-up
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {busy ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Drafting from the link telemetry…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : text ? (
          <div className="flex flex-col gap-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {text}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="self-end"
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                // Copying is the send moment — log the contact attempt.
                void logFollowUpCopiedAction({ bidId });
              }}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
