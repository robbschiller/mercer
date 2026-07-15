"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { refreshMorningBriefAction } from "@/lib/actions/morning-brief";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * The serif AI brief under the Home greeting. Rendered inside a Suspense
 * boundary so a cache-miss morning (the one Opus call of the day) streams
 * in after the page shell instead of blocking first paint.
 */
export function MorningBrief({
  initial,
}: {
  initial: { text: string; generatedAt: string } | null;
}) {
  const [brief, setBrief] = useState(initial);
  const [refreshing, startRefresh] = useTransition();

  if (!brief?.text) return null;
  return (
    <div className="mb-8">
      <p className="font-serif-brand max-w-2xl text-[22px] leading-normal text-foreground/80 [text-wrap:pretty]">
        {brief.text}
      </p>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3" />
        Generated {fmtTime(brief.generatedAt)}
        <span className="text-border">·</span>
        <button
          type="button"
          onClick={() =>
            startRefresh(async () => {
              const next = await refreshMorningBriefAction();
              setBrief(next);
            })
          }
          disabled={refreshing}
          className="inline-flex items-center gap-1 rounded underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
        >
          {refreshing && <RefreshCw className="size-3 animate-spin" />}
          Refresh
        </button>
      </p>
    </div>
  );
}

/** Two shimmer lines standing in while the day's brief generates. */
export function MorningBriefSkeleton() {
  return (
    <div className="mb-8" aria-hidden>
      <div className="flex max-w-2xl flex-col gap-2.5">
        <div className="h-[22px] w-full animate-pulse rounded-md bg-muted" />
        <div className="h-[22px] w-3/5 animate-pulse rounded-md bg-muted" />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <Sparkles className="size-3" />
        Writing today&apos;s brief…
      </p>
    </div>
  );
}
