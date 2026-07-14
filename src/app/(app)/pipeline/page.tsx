import Link from "next/link";
import {
  getPipeline,
  PIPELINE_STAGES,
  type PipelineRow,
  type PipelineStage,
} from "@/lib/store";
import { scheduleTakeoffAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const STAGE_LABELS: Record<PipelineStage, string> = {
  needs_takeoff: "Needs takeoff",
  takeoff_scheduled: "Takeoff scheduled",
  quoting: "Quoting",
  sent: "Sent",
  on_hold: "On hold",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

function parseStage(raw: string | undefined): PipelineStage | null {
  const v = raw?.trim();
  if (!v) return null;
  return (PIPELINE_STAGES as readonly string[]).includes(v)
    ? (v as PipelineStage)
    : null;
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; error?: string }>;
}) {
  const params = await searchParams;
  const stage = parseStage(params.stage);
  const all = await getPipeline();
  const rows = stage ? all.filter((r) => r.stage === stage) : all;
  const countByStage = new Map<PipelineStage, number>();
  for (const r of all) {
    countByStage.set(r.stage, (countByStage.get(r.stage) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-4 p-3 lg:p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Pipeline</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/leads/new">New lead</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/bids/new">New bid</Link>
          </Button>
        </div>
      </div>

      {params.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {params.error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <StageChip href="/pipeline" active={stage === null}>
          All · {all.length}
        </StageChip>
        {PIPELINE_STAGES.map((s) => (
          <StageChip
            key={s}
            href={`/pipeline?stage=${s}`}
            active={stage === s}
          >
            {STAGE_LABELS[s]} · {countByStage.get(s) ?? 0}
          </StageChip>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">
              {stage
                ? `Nothing in ${STAGE_LABELS[stage].toLowerCase()}.`
                : "No open deals."}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground/80">
              Every open deal lives here — from first contact through takeoff,
              quote, and send. Won deals move to Jobs.
            </p>
            <Button variant="outline" asChild>
              <Link href="/leads/new">Add a lead</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Deal</th>
                  <th className="py-2 pr-4 font-medium">Property</th>
                  <th className="py-2 pr-4 font-medium">Company</th>
                  <th className="py-2 pr-4 font-medium">Stage</th>
                  <th className="py-2 pr-4 font-medium">Value</th>
                  <th className="py-2 pr-4 font-medium">Quote</th>
                  <th className="py-2 font-medium">Next</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <PipelineTableRow key={`${row.kind}-${row.id}`} row={row} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StageChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function PipelineTableRow({ row }: { row: PipelineRow }) {
  return (
    <tr className="border-b align-middle last:border-0">
      <td className="py-2.5 pr-4">
        <Link href={row.href} className="font-medium hover:underline">
          {row.name}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-muted-foreground">
        {row.propertyName ?? "—"}
      </td>
      <td className="py-2.5 pr-4 text-muted-foreground">
        {row.company ?? "—"}
      </td>
      <td className="py-2.5 pr-4">
        <Badge variant="secondary">{STAGE_LABELS[row.stage]}</Badge>
      </td>
      <td className="py-2.5 pr-4 tabular-nums">
        {row.value != null ? money.format(row.value) : "—"}
      </td>
      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
        {row.quote ? (
          <span>
            <span className="font-medium text-foreground">
              v{row.quote.version}
            </span>{" "}
            · {QUOTE_STATUS_LABELS[row.quote.status]}
            {row.quote.viewCount > 0 && <> · Viewed {row.quote.viewCount}×</>}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="py-2.5">
        <NextCell row={row} />
      </td>
    </tr>
  );
}

/** The one action that moves this row forward. */
function NextCell({ row }: { row: PipelineRow }) {
  if (row.kind === "lead" && row.stage === "needs_takeoff") {
    return (
      <form action={scheduleTakeoffAction} className="flex items-center gap-1.5">
        <input type="hidden" name="id" value={row.id} />
        <Input
          type="date"
          name="scheduledAt"
          required
          className="h-7 w-34 text-xs"
        />
        <SubmitButton variant="outline" size="sm" className="h-7 text-xs">
          Schedule
        </SubmitButton>
      </form>
    );
  }
  if (row.kind === "lead" && row.stage === "takeoff_scheduled") {
    return (
      <span className="text-xs text-muted-foreground">
        Takeoff{" "}
        {row.takeoffScheduledAt
          ? new Date(row.takeoffScheduledAt).toLocaleDateString()
          : "booked"}{" "}
        ·{" "}
        <Link href={`/bids/new?leadId=${row.id}`} className="hover:underline">
          Start bid
        </Link>
      </span>
    );
  }
  if (row.kind === "bid" && row.stage === "quoting") {
    return (
      <Link
        href={row.href}
        className="text-xs text-muted-foreground hover:underline"
      >
        Build quote →
      </Link>
    );
  }
  if (row.kind === "bid" && row.stage === "sent") {
    return (
      <Link
        href={row.href}
        className="text-xs text-muted-foreground hover:underline"
      >
        Follow up →
      </Link>
    );
  }
  return null;
}
