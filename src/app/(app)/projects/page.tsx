import {
  AlertTriangle,
  ArrowDownNarrowWide,
  Camera,
  Check,
  ClipboardCheck,
  Clock,
  Flame,
  HardHat,
  History,
  Minus,
  Pause,
  Play,
  TrendingUp,
} from "lucide-react";
import { getJobsList, type JobsListRow } from "@/lib/store";
import {
  EmptyState,
  FilterChip,
  FilterChipRow,
  PageContainer,
  PageHeader,
  ResultSummary,
  SearchForm,
  Toolbar,
} from "@/components/chrome";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  type ProjectStatus,
} from "@/lib/status-meta";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function moneyK(n: number | null): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

const STATUS_STYLE: Record<
  ProjectStatus,
  { pill: string; dot: string }
> = {
  not_started: {
    pill: "bg-muted/60 text-foreground/80 border-border",
    dot: "bg-muted-foreground/60",
  },
  in_progress: {
    pill: "bg-info-soft text-info-foreground border-info/20",
    dot: "bg-info",
  },
  punch_out: {
    pill: "bg-violet-600/10 text-violet-700 dark:text-violet-400 border-violet-600/20",
    dot: "bg-violet-600",
  },
  complete: {
    pill: "bg-success-soft text-success-foreground border-success/25",
    dot: "bg-success",
  },
  warranty_watch: {
    pill: "bg-success-soft text-success-foreground border-success/25",
    dot: "bg-success",
  },
  on_hold: {
    pill: "bg-warning-soft text-warning-foreground border-warning/30",
    dot: "bg-warning",
  },
};

function parseStatus(raw: string | undefined): ProjectStatus | undefined {
  const v = raw?.trim();
  return v && (PROJECT_STATUSES as readonly string[]).includes(v)
    ? (v as ProjectStatus)
    : undefined;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q: rawQ } = await searchParams;
  const filter = parseStatus(status);
  const q = (rawQ ?? "").trim();
  const needle = q.toLowerCase();
  const all = await getJobsList();
  const jobs = all.filter((j) => {
    if (filter && j.status !== filter) return false;
    if (!needle) return true;
    return [j.propertyName, j.clientName].some((v) =>
      v?.toLowerCase().includes(needle),
    );
  });
  const jobsHref = (patch: { status?: ProjectStatus | null; q?: string }) => {
    const sp = new URLSearchParams();
    const nextQ = patch.q ?? q;
    const nextStatus = "status" in patch ? patch.status : filter;
    if (nextQ) sp.set("q", nextQ);
    if (nextStatus) sp.set("status", nextStatus);
    const str = sp.toString();
    return str ? `/projects?${str}` : "/projects";
  };
  const attn = jobs.filter((j) => j.attn).length;
  const totalVal = jobs.reduce((n, j) => n + (j.contract ?? 0), 0);
  const countByStatus = new Map<ProjectStatus, number>();
  for (const j of all) {
    countByStatus.set(j.status, (countByStatus.get(j.status) ?? 0) + 1);
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={{ icon: <HardHat className="size-3.5" />, label: "Delivery" }}
        title="Jobs"
        description="Won work in delivery — schedule, crew, and the money behind every contract."
      />

      {all.length === 0 ? (
        <EmptyState
          icon={<HardHat />}
          title="No jobs yet"
          description="Jobs appear here automatically the moment a property manager accepts a proposal — contract value locked, delivery ready to run."
        />
      ) : (
        <>
          <FilterChipRow>
            <FilterChip
              href={jobsHref({ status: null })}
              active={!filter}
              label="All"
              count={all.length}
            />
            {PROJECT_STATUSES.map((s) => (
              <FilterChip
                key={s}
                href={jobsHref({ status: s })}
                active={filter === s}
                label={projectStatusLabel(s)}
                count={countByStatus.get(s) ?? 0}
                dot={STATUS_STYLE[s].dot}
              />
            ))}
          </FilterChipRow>

          <Toolbar
            summary={
              <ResultSummary
                start={jobs.length === 0 ? 0 : 1}
                end={jobs.length}
                total={jobs.length}
                noun="jobs"
                extra={
                  <>
                    {attn > 0 && (
                      <>
                        {" · "}
                        <b className="font-semibold text-foreground/80">{attn}</b>{" "}
                        need attention
                      </>
                    )}
                    {" · "}
                    <b className="font-semibold text-foreground/80">
                      {moneyK(totalVal)}
                    </b>{" "}
                    in contracts
                  </>
                }
              />
            }
          >
            <SearchForm
              action="/projects"
              q={q}
              placeholder="Search properties, accounts…"
              hidden={{ status: filter }}
            />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowDownNarrowWide className="size-3.5" />
              Sorted{" "}
              <b className="font-semibold text-foreground/80">
                needs-attention first
              </b>
            </span>
          </Toolbar>

          {jobs.length === 0 ? (
            <EmptyState
              icon={<HardHat />}
              title={q ? `No jobs match “${q}”` : "Nothing in this view"}
              description="No jobs match the current filters. Clear them to see every job."
              actions={
                <Button variant="outline" asChild>
                  <Link href="/projects">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.map((j) => (
                <JobCard key={j.bidId} job={j} />
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

function JobCard({ job }: { job: JobsListRow }) {
  const pct =
    job.contract && job.contract > 0
      ? Math.round((job.spent / job.contract) * 100)
      : 0;
  const schedPct =
    job.schedElapsed != null ? Math.round(job.schedElapsed * 100) : null;
  const closed = job.status === "complete" || job.status === "warranty_watch";
  const burnAhead =
    !closed &&
    job.contract != null &&
    job.contract > 0 &&
    job.schedElapsed != null &&
    job.spent / job.contract > job.schedElapsed + 0.02;
  const staleUpdate =
    job.lastUpdateDays != null &&
    job.lastUpdateDays > 7 &&
    job.status === "in_progress";
  const st = STATUS_STYLE[job.status];

  return (
    <Link
      href={`/projects/${job.bidId}`}
      className={cn(
        "grid grid-cols-1 gap-5 rounded-2xl border bg-card p-[17px_19px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow,transform] hover:border-foreground/20 hover:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.12)] active:translate-y-px md:grid-cols-[minmax(0,1fr)_320px]",
        job.attn && "border-l-[3px] border-l-amber-500",
      )}
    >
      {/* main */}
      <div className="min-w-0">
        <div className="mb-0.5 flex items-center gap-2.5">
          <span className="truncate text-[16.5px] font-semibold tracking-tight">
            {job.propertyName}
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-xs font-semibold",
              st.pill,
            )}
          >
            <span className={cn("size-1.5 rounded-full", st.dot)} />
            {projectStatusLabel(job.status)}
          </span>
        </div>
        <p className="mb-3 truncate text-[13px] text-muted-foreground">
          {job.clientName || (
            <span className="italic text-muted-foreground/70">
              Private owner
            </span>
          )}
        </p>

        {/* schedule mini */}
        <div className="mb-3 flex items-center gap-2.5">
          <span className="whitespace-nowrap text-xs font-medium text-foreground/80">
            {job.schedText}
            {job.schedSub && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {job.schedSub}
              </span>
            )}
          </span>
          {job.schedElapsed != null && job.schedElapsed > 0 && (
            <span className="h-[5px] max-w-36 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-foreground/50"
                style={{ width: `${Math.round(job.schedElapsed * 100)}%` }}
              />
            </span>
          )}
        </div>

        {/* burn bar */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              <Flame className="size-3" />
              Budget burn
            </span>
            <span className="font-mono text-xs tabular-nums text-foreground/80">
              {moneyK(job.spent)}
              <span className="text-muted-foreground/70">
                {" "}
                / {moneyK(job.contract)}
                {job.contract ? ` · ${pct}%` : ""}
              </span>
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-muted">
            {job.spent > 0 && job.contract != null && (
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  closed
                    ? "bg-success"
                    : burnAhead
                      ? "bg-warning"
                      : job.status === "on_hold"
                        ? "bg-muted-foreground/50"
                        : "bg-foreground",
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            )}
            {schedPct != null && schedPct > 0 && schedPct < 100 && !closed && (
              <span
                title="Schedule position"
                className="absolute -inset-y-[3px] w-[2px] rounded bg-foreground/60"
                style={{ left: `${schedPct}%` }}
              />
            )}
          </div>
          <p
            className={cn(
              "mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-medium",
              closed
                ? "text-success-foreground"
                : burnAhead
                  ? "text-warning-foreground"
                  : job.status === "not_started" || job.status === "on_hold"
                    ? "text-muted-foreground"
                    : "text-success-foreground",
            )}
          >
            {closed ? (
              <>
                <Check className="size-3" />
                Fully delivered{pct >= 100 ? " · closed out" : ""}
              </>
            ) : job.status === "not_started" ? (
              <>
                <Minus className="size-3" />
                Nothing spent yet
                {job.attnReason === "Target start passed"
                  ? " · target start passed"
                  : " · ready to start"}
              </>
            ) : job.status === "on_hold" ? (
              <>
                <Pause className="size-3" />
                Paused mid-schedule
              </>
            ) : burnAhead ? (
              <>
                <TrendingUp className="size-3" />
                Burn is ahead of the schedule
              </>
            ) : (
              <>
                <Check className="size-3" />
                On budget · tracking under pace
              </>
            )}
          </p>
        </div>
      </div>

      {/* side rail */}
      <div className="flex flex-col border-t pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Contract value
        </p>
        <p className="mt-0.5 font-mono text-[19px] font-medium tabular-nums tracking-tight">
          {job.contract != null ? money.format(job.contract) : "—"}
        </p>
        <p
          className={cn(
            "mt-2.5 inline-flex items-center gap-1.5 text-xs",
            staleUpdate
              ? "font-medium text-warning-foreground"
              : "text-muted-foreground",
          )}
        >
          {job.lastUpdateDays == null ? (
            <>
              <Clock className="size-3.5" />
              No updates yet
            </>
          ) : (
            <>
              {staleUpdate ? (
                <AlertTriangle className="size-3.5" />
              ) : (
                <History className="size-3.5" />
              )}
              {job.lastUpdateDays}d since last update
            </>
          )}
        </p>
        <div className="mt-auto pt-3.5">
          <span
            className={cn(
              "inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border text-[13px] font-medium transition-colors",
              job.status === "not_started" || staleUpdate || burnAhead
                ? "border-foreground bg-foreground text-background"
                : "bg-card text-foreground/80",
            )}
          >
            <NextIcon job={job} />
            {nextLabel(job)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function nextLabel(job: JobsListRow): string {
  switch (job.status) {
    case "not_started":
      return "Start job";
    case "on_hold":
      return "Resume";
    case "warranty_watch":
      return "Log visit";
    case "complete":
      return "View closeout";
    default:
      return "Post update";
  }
}

function NextIcon({ job }: { job: JobsListRow }) {
  switch (job.status) {
    case "not_started":
    case "on_hold":
      return <Play className="size-3.5" />;
    case "warranty_watch":
    case "complete":
      return <ClipboardCheck className="size-3.5" />;
    default:
      return <Camera className="size-3.5" />;
  }
}
