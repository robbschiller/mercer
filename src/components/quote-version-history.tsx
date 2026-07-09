"use client";

import { FileText, History, Loader2, Check, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/pricing";
import { priceListCategoryLabel } from "@/lib/status-meta";
import type { LineItem, Proposal, ProposalShare } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Derived status of a stamped version, from its latest share. */
export function versionStatus(
  share: ProposalShare | null,
): "accepted" | "declined" | "sent" | "ready" {
  if (!share) return "ready";
  if (share.acceptedAt) return "accepted";
  if (share.declinedAt) return "declined";
  return "sent";
}

function statusBadge(status: "accepted" | "declined" | "sent" | "ready") {
  switch (status) {
    case "accepted":
      return (
        <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
          Accepted
        </Badge>
      );
    case "declined":
      return (
        <Badge className="border-transparent bg-destructive/10 text-destructive">
          Declined
        </Badge>
      );
    case "sent":
      return <Badge variant="secondary">Sent</Badge>;
    case "ready":
      return <Badge variant="outline">Ready</Badge>;
  }
}

function shareMeta(share: ProposalShare | null): string | null {
  if (!share) return null;
  const parts: string[] = [];
  parts.push(
    `Sent ${new Date(share.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  );
  if (share.viewCount > 0) {
    parts.push(`Viewed ${share.viewCount}×`);
  }
  if (share.declinedAt && share.declineReason) {
    parts.push(`Declined — ${share.declineReason}`);
  }
  return parts.join(" · ");
}

function snapshotTotal(snapshot: unknown): number | null {
  const s = snapshot as
    | { pricing?: { grandTotal?: number }; grandTotal?: number }
    | null;
  const total = s?.grandTotal ?? s?.pricing?.grandTotal;
  return typeof total === "number" ? total : null;
}

export function QuoteTotalsCard({
  items,
  isLargeJob,
  marginPercent,
}: {
  items: LineItem[];
  isLargeJob: boolean | null;
  marginPercent: number | null;
}) {
  const subtotal = items.reduce((s, li) => s + Number(li.amount), 0);
  const byCategory = new Map<string, number>();
  for (const li of items) {
    const key =
      li.source === "manual" && !li.category
        ? "__manual"
        : (li.category ?? "other");
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(li.amount));
  }
  const rows = [...byCategory.entries()]
    .map(([key, val]) => ({
      label: key === "__manual" ? "Added by you" : priceListCategoryLabel(key),
      val,
    }))
    .sort((a, b) => b.val - a.val);
  const max = Math.max(...rows.map((r) => r.val), 1);
  const gp = marginPercent != null ? subtotal * (marginPercent / 100) : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Draft total
          </span>
          {isLargeJob != null && (
            <Badge variant={isLargeJob ? "default" : "secondary"}>
              {isLargeJob ? "Large Job" : "Small Job"}
            </Badge>
          )}
        </div>
        <div className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">
          {formatCurrency(subtotal)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {items.length} line{items.length !== 1 ? "s" : ""} across{" "}
          {rows.length} categor{rows.length !== 1 ? "ies" : "y"}
        </div>

        {gp != null && marginPercent != null && marginPercent > 0 && (
          <div className="mt-4 flex gap-2.5">
            <div className="flex-1 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Est. gross profit
              </div>
              <div className="mt-0.5 text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatCurrency(gp)}
              </div>
            </div>
            <div className="flex-1 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Margin
              </div>
              <div className="mt-0.5 text-base font-semibold tabular-nums">
                {Math.round(marginPercent)}%
              </div>
            </div>
          </div>
        )}

        {rows.length > 1 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              By category
            </div>
            {rows.map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate text-muted-foreground">
                    {r.label}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(r.val)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(r.val / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type QuotePhase = "compose" | "generating" | "review" | "done";

export function QuoteVersionHistory({
  phase,
  proposals,
  sharesByProposal,
  nextVersion,
  draftChangeLog,
  liveTotal,
  doneSent,
}: {
  phase: QuotePhase;
  proposals: Proposal[];
  sharesByProposal: Map<string, ProposalShare>;
  nextVersion: number;
  draftChangeLog: string | null;
  liveTotal: number;
  doneSent: boolean;
}) {
  // In the done phase the in-flight row IS the just-stamped version, and the
  // revalidated proposals list already contains it — drop the duplicate so it
  // isn't rendered (and counted) twice.
  const stamped = proposals
    .filter((p) => phase === "compose" || p.version !== nextVersion)
    .sort((a, b) => b.version - a.version);
  const count = stamped.length + (phase !== "compose" ? 1 : 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-muted-foreground" />
          Version history
        </CardTitle>
        <Badge variant="outline">
          {count} version{count !== 1 ? "s" : ""}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col pt-4">
        {/* the in-flight version */}
        {phase === "compose" && (
          <VersionRow dashed>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                v{nextVersion}
              </span>
              <Badge variant="outline">Next</Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Describe the scope and build to draft this version.
            </p>
          </VersionRow>
        )}
        {phase === "generating" && (
          <VersionRow
            icon={<Loader2 className="size-3 animate-spin" />}
            current
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums">
                v{nextVersion}
              </span>
              <Badge variant="secondary">Drafting…</Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Drafting from your scope…
            </p>
          </VersionRow>
        )}
        {(phase === "review" || phase === "done") && (
          <VersionRow
            icon={
              phase === "done" ? (
                <Check className="size-3" />
              ) : (
                <PencilLine className="size-3" />
              )
            }
            current
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums">
                v{nextVersion}
              </span>
              {phase === "review" ? (
                <Badge variant="outline">Draft</Badge>
              ) : doneSent ? (
                <Badge variant="secondary">Sent</Badge>
              ) : (
                <Badge variant="outline">Ready</Badge>
              )}
            </div>
            {draftChangeLog && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {draftChangeLog}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-semibold tabular-nums">
                {formatCurrency(liveTotal)}
              </span>
              <span className="text-muted-foreground">
                {phase === "review" ? "· Editing now" : "· Stamped just now"}
              </span>
            </div>
          </VersionRow>
        )}

        {/* stamped versions */}
        {stamped.map((p) => {
          const share = sharesByProposal.get(p.id) ?? null;
          const status = versionStatus(share);
          const total = snapshotTotal(p.snapshot);
          const meta = shareMeta(share);
          return (
            <VersionRow
              key={p.id}
              icon={
                status === "accepted" ? (
                  <Check className="size-3" />
                ) : (
                  <FileText className="size-3" />
                )
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums">
                  v{p.version}
                </span>
                {statusBadge(status)}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {p.changeLog && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {p.changeLog}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2 text-xs">
                {total != null && (
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(total)}
                  </span>
                )}
                {meta && (
                  <span className="text-[11px] text-muted-foreground">
                    {total != null ? "· " : ""}
                    {meta}
                  </span>
                )}
              </div>
            </VersionRow>
          );
        })}

        {stamped.length === 0 && phase === "compose" && (
          <p className="pb-2 text-xs text-muted-foreground">
            No versions stamped yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function VersionRow({
  children,
  icon,
  current,
  dashed,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  current?: boolean;
  dashed?: boolean;
}) {
  return (
    <div className="relative pb-5 pl-8 last:pb-2 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:left-[11px] [&:not(:last-child)]:before:top-6 [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-border">
      <span
        className={cn(
          "absolute left-0 top-0.5 flex size-[22px] items-center justify-center rounded-full border bg-background text-muted-foreground",
          current && "border-primary text-primary",
          dashed && "border-dashed",
        )}
      >
        {icon ?? <span className="size-1.5 rounded-full bg-border" />}
      </span>
      {children}
    </div>
  );
}
