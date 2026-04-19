import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getBidsWithSummary,
  getDashboardPipelineFinances,
  getLeadSourceTags,
  getLeads,
  type Lead,
} from "@/lib/store";
import { formatCurrency } from "@/lib/pricing";

function pct(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function filterLeadsBySource(leads: Lead[], source: string | undefined) {
  if (!source) return leads;
  return leads.filter((l) => l.sourceTag === source);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source: sourceParam } = await searchParams;
  const source = sourceParam?.trim() || undefined;

  const [bids, leads, sourceTags, finances] = await Promise.all([
    getBidsWithSummary(),
    getLeads(),
    getLeadSourceTags(),
    getDashboardPipelineFinances({ sourceTag: source ?? null }),
  ]);

  const scopedLeads = filterLeadsBySource(leads, source);

  const bidStats = {
    total: bids.length,
    draft: bids.filter((b) => b.status === "draft").length,
    sent: bids.filter((b) => b.status === "sent").length,
    won: bids.filter((b) => b.status === "won").length,
    lost: bids.filter((b) => b.status === "lost").length,
  };

  const leadStats = {
    total: scopedLeads.length,
    new: scopedLeads.filter((l) => l.status === "new").length,
    quoted: scopedLeads.filter((l) => l.status === "quoted").length,
    won: scopedLeads.filter((l) => l.status === "won").length,
    lost: scopedLeads.filter((l) => l.status === "lost").length,
  };

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
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold">{leads.length}</p>
            <p className="text-xs text-muted-foreground">
              Totals across all sources. Use Pipeline above to scope by source
              tag.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="New" value={leads.filter((l) => l.status === "new").length} />
              <Stat
                label="Quoted"
                value={leads.filter((l) => l.status === "quoted").length}
              />
              <Stat label="Won" value={leads.filter((l) => l.status === "won").length} />
              <Stat
                label="Lost"
                value={leads.filter((l) => l.status === "lost").length}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate: {pct(leads.filter((l) => l.status === "won").length, leads.length)}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}
