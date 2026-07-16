import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Calculator,
  FilePlus2,
  Moon,
  Play,
  Upload,
  UserPlus,
  Waypoints,
} from "lucide-react";
import {
  getPipeline,
  PIPELINE_STAGES,
  type PipelineRow,
  type PipelineStage,
} from "@/lib/store";
import { scheduleTakeoffAction } from "@/lib/actions";
import { FollowUpNudge } from "@/components/follow-up-nudge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

// Tab names match the status dropdown exactly (Jordan C6) — one vocabulary.
const STAGE_LABELS: Record<PipelineStage, string> = {
  takeoff: "Takeoff",
  quoting: "Quoting",
  sent: "Quote sent",
  on_hold: "On hold",
};

const STAGE_DOTS: Record<PipelineStage, string> = {
  takeoff: "bg-cyan-600",
  quoting: "bg-violet-600",
  sent: "bg-blue-600",
  on_hold: "bg-amber-500",
};

function compactMoney(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function ageAmber(row: PipelineRow): boolean {
  if (row.stage === "takeoff" && row.takeoffScheduledAt == null)
    return ageDays(row) > 7;
  if (row.stage === "sent") return ageDays(row) > 5;
  return false;
}

function ageDays(row: PipelineRow): number {
  if (row.stage === "sent" && row.sentDaysAgo != null) return row.sentDaysAgo;
  return Math.max(
    0,
    Math.round((Date.now() - row.updatedAt.getTime()) / 86_400_000),
  );
}

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
  searchParams: Promise<{ stage?: string; lens?: string; error?: string }>;
}) {
  const params = await searchParams;
  const stage = parseStage(params.stage);
  const quiet = params.lens === "quiet";
  const all = await getPipeline();

  const rows = quiet
    ? all
        .filter((r) => r.stage === "sent")
        .sort((a, b) => {
          if (a.neverOpened !== b.neverOpened) return a.neverOpened ? 1 : -1;
          return (b.silentDays ?? 0) - (a.silentDays ?? 0);
        })
    : stage
      ? all.filter((r) => r.stage === stage)
      : all;

  const byStage = new Map<PipelineStage, PipelineRow[]>();
  for (const r of all) {
    byStage.set(r.stage, [...(byStage.get(r.stage) ?? []), r]);
  }
  const sumValue = (arr: PipelineRow[]) =>
    arr.reduce((n, r) => n + (r.value ?? 0), 0);
  const activeChip = quiet ? "sent" : (stage ?? "all");

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      {/* header */}
      <header className="mb-5 flex items-end gap-5">
        <div>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Pipeline
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Every open project, first contact to signed.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/leads/new">
              <UserPlus className="size-4" />
              New lead
            </Link>
          </Button>
          <Button asChild>
            <Link href="/opportunities/new">
              <FilePlus2 className="size-4" />
              New opportunity
            </Link>
          </Button>
        </div>
      </header>

      {params.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {params.error}
        </div>
      )}

      {all.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60">
            <Waypoints className="size-6" />
          </span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">
            Nothing in the pipeline yet
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
            New leads land here the moment they come in — from a referral, your
            website, or a walk-up. Add one by hand, or import a list to get
            moving.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link href="/leads/new">
                <UserPlus className="size-4" />
                New lead
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/leads/import">
                <Upload className="size-4" />
                Import leads
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* stage rail */}
          <div className="mb-4 flex flex-wrap gap-2">
            <StageChip
              href="/pipeline"
              active={activeChip === "all" && !quiet}
              label="All"
              count={all.length}
            />
            {PIPELINE_STAGES.map((s) => {
              const arr = byStage.get(s) ?? [];
              const v = sumValue(arr);
              return (
                <StageChip
                  key={s}
                  href={`/pipeline?stage=${s}`}
                  active={activeChip === s}
                  label={STAGE_LABELS[s]}
                  count={arr.length}
                  value={v > 0 ? compactMoney(v) : null}
                />
              );
            })}
          </div>

          {/* lens toolbar */}
          <div className="mb-2 flex items-center gap-3.5 px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Show
            </span>
            <div className="flex gap-0.5 rounded-[9px] border bg-muted/70 p-[3px]">
              <LensButton
                href={stage ? `/pipeline?stage=${stage}` : "/pipeline"}
                active={!quiet}
              >
                All
              </LensButton>
              <LensButton href="/pipeline?lens=quiet" active={quiet}>
                <Moon className="size-3" />
                Going quiet
              </LensButton>
            </div>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {quiet ? (
                <>
                  <b className="font-semibold text-foreground/80">
                    {rows.length}
                  </b>{" "}
                  going quiet · {rows.filter((r) => !r.neverOpened).length}{" "}
                  viewed &amp; silent, {rows.filter((r) => r.neverOpened).length}{" "}
                  never opened
                </>
              ) : activeChip === "all" ? (
                <>
                  <b className="font-semibold text-foreground/80">
                    {rows.length}
                  </b>{" "}
                  projects ·{" "}
                  <b className="font-semibold text-foreground/80">
                    {compactMoney(sumValue(all))}
                  </b>{" "}
                  in open quotes
                </>
              ) : (
                <>
                  <b className="font-semibold text-foreground/80">
                    {rows.length}
                  </b>{" "}
                  {STAGE_LABELS[stage!].toLowerCase()}
                  {sumValue(rows) > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <b className="font-semibold text-foreground/80">
                        {compactMoney(sumValue(rows))}
                      </b>
                    </>
                  )}
                </>
              )}
            </span>
          </div>

          {/* table */}
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
            <div className="min-w-[940px]">
              <div className="grid grid-cols-[minmax(180px,1.5fr)_100px_128px_72px_144px_58px_minmax(200px,auto)] items-center gap-x-2.5 border-b bg-muted/30 py-2.5 pl-4 pr-10">
                {["Project", "Company", "Stage", "Value", "Quote", "Age", "Next"].map(
                  (h) => (
                    <span
                      key={h}
                      className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                    >
                      {h}
                    </span>
                  ),
                )}
              </div>
              <div className="flex flex-col">
                {rows.map((row) => (
                  <PipelineTableRow key={`${row.kind}-${row.id}`} row={row} quiet={quiet} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StageChip({
  href,
  active,
  label,
  count,
  value,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  value?: string | null;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[38px] items-baseline gap-2 whitespace-nowrap rounded-[10px] border px-3.5 text-[13.5px] font-medium leading-[36px] transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
      )}
    >
      {label}
      <span
        className={cn(
          "font-semibold tabular-nums",
          active ? "text-background/90" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
      {value && (
        <span
          className={cn(
            "border-l pl-2 font-mono text-xs",
            active
              ? "border-background/20 text-background/70"
              : "text-muted-foreground/80",
          )}
        >
          {value}
        </span>
      )}
    </Link>
  );
}

function LensButton({
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
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function PipelineTableRow({
  row,
  quiet,
}: {
  row: PipelineRow;
  quiet: boolean;
}) {
  const age = ageDays(row);
  return (
    <div className="group relative grid grid-cols-[minmax(180px,1.5fr)_100px_128px_72px_144px_58px_minmax(200px,auto)] items-center gap-x-2.5 border-t py-3 pl-4 pr-10 transition-colors first:border-t-0 hover:bg-muted/20">
      {/* project */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 truncate text-sm font-semibold tracking-tight">
          {row.advancedToday && (
            <span
              title="Advanced today"
              className="size-[7px] shrink-0 rounded-full bg-blue-600 shadow-[0_0_0_3px] shadow-blue-600/15"
            />
          )}
          <Link href={row.href} className="truncate hover:underline">
            {row.name}
          </Link>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {row.propertyName ?? "—"}
        </div>
      </div>
      {/* company */}
      <div className="truncate text-[13px] text-foreground/80">
        {row.company ?? (
          <span className="italic text-muted-foreground/70">Private owner</span>
        )}
      </div>
      {/* stage */}
      <div>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-muted/50 py-[3px] pl-2 pr-2.5 text-xs font-medium text-foreground/80">
          <span
            className={cn("size-1.5 rounded-full", STAGE_DOTS[row.stage])}
          />
          {STAGE_LABELS[row.stage]}
        </span>
      </div>
      {/* value */}
      <div
        className={cn(
          "font-mono text-[13px] font-medium tabular-nums",
          row.value == null && "font-sans text-muted-foreground/60",
        )}
      >
        {row.value == null ? "—" : compactMoney(row.value)}
      </div>
      {/* quote */}
      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
        {row.quote ? (
          <>
            <span className="rounded-[5px] bg-muted px-1.5 py-px font-mono text-[11px] font-medium text-muted-foreground">
              v{row.quote.version}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-medium capitalize text-foreground/80">
              {row.quote.status}
            </span>
            {row.stage === "sent" && (
              <>
                <span className="text-muted-foreground/50">·</span>
                {row.neverOpened ? (
                  <span className="text-muted-foreground/60">Not opened</span>
                ) : (
                  <span className="font-semibold text-blue-600">
                    Viewed {row.quote.viewCount}×
                  </span>
                )}
              </>
            )}
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>
      {/* age */}
      <div
        className={cn(
          "font-mono text-xs tabular-nums text-muted-foreground",
          quiet && !row.neverOpened && "font-semibold text-amber-600",
          !quiet && ageAmber(row) && "font-semibold text-amber-600",
          row.stage === "on_hold" && "text-muted-foreground/60",
        )}
      >
        {quiet
          ? row.neverOpened
            ? `unopened ${age}d`
            : `silent ${row.silentDays ?? age}d`
          : `${age}d`}
      </div>
      {/* next */}
      <div className="flex items-center">
        <NextCell row={row} />
      </div>
      {/* hover open */}
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <Link
          href={row.href}
          title="Open"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function NextCell({ row }: { row: PipelineRow }) {
  // One Takeoff stage (C6): the row shows schedule state as data — a date
  // picker when the walk isn't booked, the booked slot when it is.
  if (row.kind === "lead" && row.stage === "takeoff") {
    if (row.takeoffScheduledAt == null) {
      return (
        <form action={scheduleTakeoffAction} className="flex items-center gap-1.5">
          <input type="hidden" name="id" value={row.id} />
          <Input
            type="date"
            name="scheduledAt"
            required
            className="h-8 w-[7.5rem] text-xs"
          />
          <SubmitButton variant="outline" size="sm" className="h-8 text-xs">
            Schedule
          </SubmitButton>
        </form>
      );
    }
    const past = row.takeoffScheduledAt.getTime() < Date.now();
    if (past) {
      return (
        <Link
          href={`/opportunities/new?leadId=${row.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          <Calculator className="size-3.5" />
          Convert to opportunity
        </Link>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-foreground/80">
        <Calendar className="size-3.5 text-muted-foreground" />
        {`${row.takeoffScheduledAt.toLocaleDateString("en-US", { weekday: "short" })} · ${row.takeoffScheduledAt.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase().replace(" ", "")}`}
      </span>
    );
  }
  if (row.kind === "bid" && row.stage === "quoting") {
    return (
      <Link
        href={row.href}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background [&:hover_svg]:text-background"
      >
        Build quote
        <ArrowRight className="size-3.5 text-blue-600" />
      </Link>
    );
  }
  if (row.kind === "bid" && row.stage === "sent") {
    return <FollowUpNudge bidId={row.id} />;
  }
  if (row.stage === "on_hold") {
    return (
      <Link
        href={row.href}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Play className="size-3.5" />
        Resume
      </Link>
    );
  }
  return null;
}
