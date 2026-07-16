"use client";

import { useState } from "react";
import { Lightbulb, Trophy } from "lucide-react";
import type { WinLossByCompany } from "@/lib/store";
import { cn } from "@/lib/utils";

function moneyK(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "").replace(/\.$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

/**
 * The star panel: who says yes, against the house average. Client component
 * only for the Win % / Won $ sort lens — every number arrives derived.
 */
export function WinRateByCompany({ rows }: { rows: WinLossByCompany[] }) {
  const [sort, setSort] = useState<"rate" | "value">("rate");

  const decided = rows.filter((r) => r.won + r.lost > 0);
  const totalWon = decided.reduce((n, r) => n + r.won, 0);
  const totalDecided = decided.reduce((n, r) => n + r.won + r.lost, 0);
  const avg =
    totalDecided > 0 ? Math.round((totalWon / totalDecided) * 100) : 0;

  const rateOf = (r: WinLossByCompany) =>
    r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : 0;
  const leader =
    decided.length > 0
      ? [...decided].sort((a, b) => rateOf(b) - rateOf(a))[0].company
      : null;
  const sorted = [...decided].sort((a, b) =>
    sort === "value" ? b.wonValue - a.wonValue : rateOf(b) - rateOf(a),
  );

  // Honest insight, only when the data can carry it: the surest buyer by
  // rate (min 2 decided), and whoever has walked away the most.
  const surest = [...decided]
    .filter((r) => r.won + r.lost >= 2)
    .sort((a, b) => rateOf(b) - rateOf(a) || b.wonValue - a.wonValue)[0];
  const coldest = [...decided]
    .filter((r) => r.lost >= 2)
    .sort((a, b) => b.lost - a.lost)[0];

  return (
    <div
      id="winByCo"
      className="scroll-mt-4 overflow-hidden rounded-2xl border border-foreground/15 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
    >
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-foreground text-background">
          <Trophy className="size-[15px]" />
        </span>
        <span className="text-[13.5px] font-semibold tracking-tight">
          Win rate by company
        </span>
        <span className="hidden truncate text-xs tabular-nums text-muted-foreground/80 sm:inline">
          · {totalWon} won of {totalDecided} decided
        </span>
        <div className="ml-auto flex shrink-0 gap-0.5 rounded-lg border bg-muted/60 p-[3px]">
          {(["rate", "value"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                sort === s
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "rate" ? "Win %" : "Won $"}
            </button>
          ))}
        </div>
      </div>

      {decided.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          No decided opportunities yet — win rates appear once the first quote comes
          back accepted or declined.
        </p>
      ) : (
        <div className="flex flex-col">
          {sorted.map((r, i) => {
            const rate = rateOf(r);
            return (
              <div
                key={r.company}
                className={cn(
                  "px-[18px] py-[15px] transition-colors hover:bg-muted/20",
                  i > 0 && "border-t border-border/60",
                )}
              >
                <div className="mb-2 flex items-baseline gap-2.5">
                  <span className="truncate text-sm font-semibold tracking-tight">
                    {r.company}
                  </span>
                  <span className="ml-auto flex shrink-0 items-baseline gap-2">
                    <span className="font-mono text-[15px] font-medium tabular-nums">
                      {rate}%
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground/80">
                      {r.won} of {r.won + r.lost}
                    </span>
                  </span>
                </div>
                <div className="relative h-2.5 rounded-full bg-muted">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      r.company === leader
                        ? "bg-gradient-to-r from-foreground/80 to-foreground"
                        : rate < 50
                          ? "bg-muted-foreground/50"
                          : "bg-foreground",
                    )}
                    style={{ width: `${rate}%` }}
                  />
                  {avg > 0 && avg < 100 && (
                    <div
                      className="absolute -inset-y-1 w-0 border-l-[1.5px] border-dashed border-foreground/50"
                      style={{ left: `${avg}%` }}
                      title={`House average ${avg}%`}
                    />
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono font-medium tabular-nums text-foreground/80">
                    {moneyK(r.wonValue)} won
                  </span>
                  <span className="text-border">·</span>
                  <span
                    className={cn(
                      r.lost >= 3 &&
                        "font-medium text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {r.lost} lost
                  </span>
                  {r.open > 0 && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-blue-700 dark:text-blue-400">
                        {r.open} open
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {(surest || coldest) && (
            <div className="flex items-start gap-2.5 border-t border-border/60 bg-muted/20 px-[18px] py-3.5">
              <Lightbulb className="mt-px size-[15px] shrink-0 text-foreground/70" />
              <p className="text-[12.5px] leading-relaxed text-foreground/80">
                {surest && (
                  <>
                    <b className="font-semibold">{surest.company}</b> accepts{" "}
                    {surest.won} of {surest.won + surest.lost} — your surest
                    buyer{coldest && coldest.company !== surest.company ? ". " : "."}
                  </>
                )}
                {coldest && coldest.company !== surest?.company && (
                  <>
                    <b className="font-semibold">{coldest.company}</b> has
                    walked away {coldest.lost} time
                    {coldest.lost === 1 ? "" : "s"} — worth a look at what they
                    keep saying no to.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
