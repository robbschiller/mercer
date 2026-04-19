import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  HardHat,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getBidStatusCounts,
  getDashboardPipelineFinances,
  getLeadSourceTags,
  getLeadStatusCounts,
  getProjectStatusCounts,
} from "@/lib/store";
import { formatCurrency } from "@/lib/pricing";

function pct(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source: sourceParam } = await searchParams;
  const source = sourceParam?.trim() || undefined;

  // Pipeline section is scoped to the active source filter; the per-tab Leads
  // card always shows totals across every source. When no source filter is
  // active the two are identical and we reuse the scoped result.
  const [
    bidStats,
    leadStats,
    leadStatsAll,
    sourceTags,
    finances,
    projectStats,
  ] = await Promise.all([
    getBidStatusCounts(),
    getLeadStatusCounts({ sourceTag: source ?? null }),
    source ? getLeadStatusCounts() : null,
    getLeadSourceTags(),
    getDashboardPipelineFinances({ sourceTag: source ?? null }),
    getProjectStatusCounts(),
  ]);

  const leadCardStats = leadStatsAll ?? leadStats;

  const dashboardHref = (tag: string | null) => {
    if (!tag) return "/dashboard";
    return `/dashboard?${new URLSearchParams({ source: tag }).toString()}`;
  };

  const leadsHref = (status: string | null) => {
    const p = new URLSearchParams();
    if (source) p.set("source", source);
    if (status) p.set("status", status);
    const qs = p.toString();
    return qs ? `/leads?${qs}` : "/leads";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Snapshot of your lead pipeline and bids.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {sourceTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Source:</span>
              <FilterChip
                label="All"
                active={!source}
                href={dashboardHref(null)}
              />
              {sourceTags.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  active={source === tag}
                  href={dashboardHref(tag)}
                />
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-end">
            <PipelineStage
              label="Leads"
              value={leadStats.total}
              href={leadsHref(null)}
              hint="All leads in scope"
            />
            <div
              className="hidden sm:flex justify-center pb-8 text-muted-foreground"
              aria-hidden
            >
              →
            </div>
            <PipelineStage
              label="Quoted"
              value={leadStats.quoted}
              href={leadsHref("quoted")}
              hint={`${pct(leadStats.quoted, leadStats.total)} of leads`}
            />
            <div
              className="hidden sm:flex justify-center pb-8 text-muted-foreground"
              aria-hidden
            >
              →
            </div>
            <PipelineStage
              label="Won"
              value={leadStats.won}
              href={leadsHref("won")}
              hint={
                leadStats.quoted > 0
                  ? `${pct(leadStats.won, leadStats.quoted)} of quoted`
                  : "No quoted leads yet"
              }
            />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border-t pt-4">
            <span>
              New (not quoted):{" "}
              <Link
                href={leadsHref("new")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {leadStats.new}
              </Link>
            </span>
            <span>
              Lost:{" "}
              <Link
                href={leadsHref("lost")}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {leadStats.lost}
              </Link>
            </span>
            <span>
              Win rate (leads):{" "}
              <span className="font-medium text-foreground">
                {pct(leadStats.won, leadStats.total)}
              </span>
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 rounded-md border bg-muted/30 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Open pipeline ($)</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatCurrency(finances.openPipelineUsd)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Latest proposal total per bid (draft + sent).
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Closed won ($)</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatCurrency(finances.wonBookedUsd)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Latest proposal total per won bid.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold">{leadCardStats.total}</p>
            <p className="text-xs text-muted-foreground">
              Totals across all sources. Use Pipeline above to scope by source
              tag.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="New" value={leadCardStats.new} />
              <Stat label="Quoted" value={leadCardStats.quoted} />
              <Stat label="Won" value={leadCardStats.won} />
              <Stat label="Lost" value={leadCardStats.lost} />
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate: {pct(leadCardStats.won, leadCardStats.total)}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/leads">
                View leads
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Bids</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold">{bidStats.total}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Draft" value={bidStats.draft} />
              <Stat label="Sent" value={bidStats.sent} />
              <Stat label="Won" value={bidStats.won} />
              <Stat label="Lost" value={bidStats.lost} />
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate: {pct(bidStats.won, bidStats.total)}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/bids">
                View bids
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Projects</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-semibold tabular-nums">
                {projectStats.active}
              </p>
              <p className="text-xs text-muted-foreground">
                active of {projectStats.total} total
              </p>
            </div>
            {projectStats.overdue > 0 ? (
              <Link
                href="/projects"
                className="block rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
              >
                <span className="font-medium">
                  {projectStats.overdue} overdue
                </span>{" "}
                — past target end date and not complete
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">
                No projects past their target end date.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat
                label="Not started"
                value={projectStats.not_started}
                href="/projects?status=not_started"
              />
              <Stat
                label="In progress"
                value={projectStats.in_progress}
                href="/projects?status=in_progress"
              />
              <Stat
                label="Punch out"
                value={projectStats.punch_out}
                href="/projects?status=punch_out"
              />
              <Stat
                label="On hold"
                value={projectStats.on_hold}
                href="/projects?status=on_hold"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Complete:{" "}
              <Link
                href="/projects?status=complete"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {projectStats.complete}
              </Link>
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                View projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "hover:bg-muted"
      }`}
    >
      {label}
    </Link>
  );
}

function PipelineStage({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number;
  href: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-md border p-2 transition-colors hover:bg-muted/50"
      >
        {body}
      </Link>
    );
  }
  return <div className="rounded-md border p-2">{body}</div>;
}
