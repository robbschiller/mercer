import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock,
  Filter,
  Info,
  MessageSquareQuote,
  Percent,
  Send,
  Target,
  Waypoints,
  CornerDownRight,
} from "lucide-react";
import {
  getDeclineReasons,
  getReportData,
  getReportsExtras,
  getWinLossByCompany,
} from "@/lib/store";
import { WinRateByCompany } from "@/components/win-rate-by-company";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
function moneyK(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "").replace(/\.$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const pct1 = (a: number, b: number) =>
  b > 0 ? Math.round((a / b) * 1000) / 10 : 0;

const MARGIN_FLOOR = 20;

export default async function ReportsPage() {
  const [data, winLoss, declines, extras] = await Promise.all([
    getReportData(),
    getWinLossByCompany(),
    getDeclineReasons(),
    getReportsExtras(),
  ]);

  const leadCounts = new Map(data.leadFunnel.map((r) => [r.status, r.count]));
  const lc = (s: string) => leadCounts.get(s as never) ?? 0;
  const bidCounts = new Map(data.bidFunnel.map((r) => [r.status, r.count]));
  const bc = (s: string) => bidCounts.get(s as never) ?? 0;

  const bidWon = bc("won");
  const bidLost = bc("lost");
  const decided = bidWon + bidLost;
  const openDeals =
    lc("takeoff") + lc("on_hold") + bc("draft") + bc("sent");

  // Headline margin derives from the same per-job rows the table shows.
  const delivered = extras.deliveredJobs;
  const dContract = delivered.reduce((n, j) => n + j.contracted, 0);
  const dSpent = delivered.reduce((n, j) => n + j.spent, 0);
  const dProfit = dContract - dSpent;
  const dMargin = pct1(dProfit, dContract);
  const underCount = delivered.filter(
    (j) => pct1(j.contracted - j.spent, j.contracted) < MARGIN_FLOOR,
  ).length;

  const { awaiting } = extras;
  const awaitingStale = (awaiting.oldestDays ?? 0) >= 7;

  // Six-month rhythm: bars = bids won, line = contracted value.
  const rhythm = data.monthly.map((m, i) => ({
    label: new Date(`${m.month}-15T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
    }),
    won: m.bidsWon,
    value: m.wonValue,
    partial: i === data.monthly.length - 1,
  }));
  const hasRhythm = rhythm.some((m) => m.won > 0 || m.value > 0);
  const maxWon = Math.max(1, ...rhythm.map((m) => m.won));
  const rawMax = Math.max(...rhythm.map((m) => m.value), 1);
  // Nice line-scale ceiling: 1/2/5 × 10^k above the max month.
  const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const niceVal =
    [1, 2, 5, 10].map((f) => f * mag).find((v) => v >= rawMax) ?? rawMax;
  const peakIdx = rhythm.reduce(
    (mi, m, i) => (m.value > rhythm[mi].value ? i : mi),
    0,
  );
  const RC_H = 180;
  const PAD_T = 20;
  const PAD_B = 12;
  const BAR_MAX = 96;
  const yFor = (v: number) => PAD_T + (1 - v / niceVal) * (RC_H - PAD_T - PAD_B);
  const cx = (i: number) => ((i + 0.5) / rhythm.length) * 100;
  const linePts = rhythm
    .map((m, i) => `${cx(i)},${(yFor(m.value) / RC_H) * 100}`)
    .join(" ");
  const peak = rhythm[peakIdx];

  const declinesWithReason = declines.filter((d) => d.hasReason).length;

  const funnels = [
    {
      title: "Lead funnel",
      sub: "where every lead stands right now",
      stages: [
        {
          label: "Leads captured",
          count: data.leadFunnel.reduce((n, r) => n + r.count, 0),
        },
        {
          label: "Reached takeoff",
          count: data.takeoffBooked + lc("quoted") + lc("won"),
        },
        { label: "Quoted", count: lc("quoted") + lc("won") },
        { label: "Won", count: lc("won") },
      ],
    },
    {
      title: "Opportunity funnel",
      sub: "drafted → sent → decided → won",
      stages: [
        { label: "Drafted", count: bc("draft") + bc("sent") + decided },
        { label: "Sent", count: bc("sent") + decided },
        { label: "Decided", count: decided },
        { label: "Won", count: bidWon },
      ],
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[1300px] px-6 pb-24 pt-7">
      <header className="mb-6 flex flex-wrap items-end gap-5">
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            <span className="size-[7px] animate-pulse rounded-full bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/15" />
            Business · derived live
          </p>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Reports
          </h1>
          <p className="mt-1 max-w-[560px] text-[13.5px] text-muted-foreground">
            Where next month comes from — and whether the business behind it is
            healthy. No date pickers; every number comes from the same rows the
            rest of the app writes.
          </p>
        </div>
      </header>

      {/* ── stat row ── */}
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/pipeline"
          icon={<Waypoints className="size-[15px]" />}
          label="Open pipeline"
          hint="Go to pipeline"
        >
          <StatValue big={moneyK(data.pipeline.openPipelineUsd)} />
          <StatSub>
            {openDeals} open project{openDeals === 1 ? "" : "s"} ·{" "}
            {bc("draft") + bc("sent")} at quote stage
          </StatSub>
        </StatCard>
        <StatCard
          href="#winByCo"
          icon={<Target className="size-[15px]" />}
          label="Win rate"
          hint="Win rate by company"
        >
          <StatValue big={decided > 0 ? `${pct(bidWon, decided)}%` : "—"} />
          <StatSub>
            {decided > 0
              ? `${bidWon} won of ${decided} decided opportunit${decided === 1 ? "y" : "ies"}`
              : "no decided opportunities yet"}
          </StatSub>
        </StatCard>
        <StatCard
          href="#marginTable"
          icon={<Percent className="size-[15px]" />}
          label="Delivered margin"
          chip={
            underCount > 0 ? (
              <Chip tone="amber">
                {underCount} under {MARGIN_FLOOR}%
              </Chip>
            ) : undefined
          }
          hint="See the job breakdown"
        >
          <StatValue
            big={delivered.length > 0 ? `${dMargin.toFixed(1)}%` : "—"}
          />
          <StatSub>
            {delivered.length > 0
              ? `${moneyK(dProfit)} profit on ${moneyK(dContract)} delivered`
              : "no jobs closed out yet"}
          </StatSub>
        </StatCard>
        <StatCard
          href="/pipeline?stage=sent"
          icon={<Send className="size-[15px]" />}
          label="Awaiting response"
          chip={
            awaiting.oldestDays != null ? (
              <Chip tone={awaitingStale ? "amber" : "plain"}>
                <Clock className="size-3" />
                {awaiting.oldestDays}d oldest
              </Chip>
            ) : undefined
          }
          hint="Chase them in pipeline"
        >
          <StatValue
            big={String(awaiting.count)}
            small={awaiting.count > 0 ? moneyK(awaiting.totalValue) : undefined}
          />
          <StatSub>
            {awaiting.count > 0
              ? "quotes out the door, still quiet"
              : "nothing waiting on a customer"}
          </StatSub>
        </StatCard>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.52fr)_minmax(338px,1fr)]">
        {/* ── left column ── */}
        <div className="flex min-w-0 flex-col gap-4">
          <WinRateByCompany rows={winLoss} />

          {/* six-month rhythm */}
          <Panel
            icon={<Activity className="size-[15px]" />}
            title="Six-month rhythm"
            note={`${rhythm[0].label} – ${rhythm[rhythm.length - 1].label}`}
            right={
              <span className="hidden items-center gap-3.5 sm:flex">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                  <span className="size-[11px] rounded-[3px] bg-foreground/25" />
                  Won
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                  <span className="relative h-0 w-3.5 border-t-2 border-foreground">
                    <span className="absolute left-1/2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
                  </span>
                  Contracted $
                </span>
              </span>
            }
          >
            <div className="p-4">
              {!hasRhythm ? (
                <p className="text-sm text-muted-foreground">
                  No wins on the board yet — the chart starts with the first
                  accepted quote.
                </p>
              ) : (
                <>
                  <div className="relative mx-1" style={{ height: RC_H + 28 }}>
                    {/* gridlines + $ axis */}
                    {[niceVal, niceVal / 2, 0].map((v) => (
                      <div
                        key={v}
                        className="absolute inset-x-0 border-t border-dashed border-border/70"
                        style={{ top: yFor(v) }}
                      >
                        <span className="absolute -top-2 right-0 bg-card pl-1.5 font-mono text-[9.5px] text-muted-foreground/70">
                          {v === 0 ? "$0" : moneyK(v)}
                        </span>
                      </div>
                    ))}
                    {/* bars */}
                    {rhythm.map((m, i) => (
                      <div
                        key={m.label}
                        className="absolute bottom-7 flex w-10 -translate-x-1/2 flex-col items-center justify-end"
                        style={{ left: `${cx(i)}%` }}
                      >
                        <span className="mb-1 font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
                          {m.won}
                        </span>
                        <div
                          className={cn(
                            "w-[30px] rounded-t-[5px]",
                            m.partial
                              ? "bg-[repeating-linear-gradient(-45deg,var(--color-border),var(--color-border)_4px,transparent_4px,transparent_7px)] bg-muted"
                              : "bg-foreground/25",
                          )}
                          style={{
                            height: Math.round((m.won / maxWon) * BAR_MAX),
                          }}
                        />
                      </div>
                    ))}
                    {/* value line */}
                    <svg
                      className="pointer-events-none absolute left-0 top-0 w-full overflow-visible"
                      style={{ height: RC_H }}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <polyline
                        points={linePts}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        className="text-foreground"
                      />
                    </svg>
                    {/* dots + peak/current labels */}
                    {rhythm.map((m, i) => {
                      const top = yFor(m.value);
                      const isPeak = i === peakIdx;
                      const showVal = isPeak || m.partial;
                      const below = top < 24;
                      return (
                        <span key={`d-${m.label}`}>
                          <span
                            className={cn(
                              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card",
                              isPeak
                                ? "size-2.5 bg-blue-600"
                                : "size-2 bg-foreground",
                            )}
                            style={{ left: `${cx(i)}%`, top }}
                          />
                          {showVal && (
                            <span
                              className={cn(
                                "absolute -translate-x-1/2 font-mono text-[10px] font-medium tabular-nums",
                                isPeak
                                  ? "font-semibold text-blue-700 dark:text-blue-400"
                                  : "text-foreground/80",
                              )}
                              style={{
                                left: `${cx(i)}%`,
                                top: below ? top + 10 : top - 22,
                              }}
                            >
                              {moneyK(m.value)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                    {/* x labels */}
                    {rhythm.map((m, i) => (
                      <span
                        key={`x-${m.label}`}
                        className={cn(
                          "absolute bottom-0 -translate-x-1/2 text-center text-[11px] font-medium",
                          m.partial
                            ? "text-muted-foreground/60"
                            : "text-muted-foreground/80",
                        )}
                        style={{ left: `${cx(i)}%` }}
                      >
                        {m.label}
                        {m.partial && (
                          <span className="ml-1 text-[9px] tracking-[0.03em] text-muted-foreground/50">
                            MTD
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3.5 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <Info className="size-3.5 shrink-0 text-blue-600" />
                    {peak.value > 0 ? (
                      <>
                        {peak.label} leads the stretch — {moneyK(peak.value)}{" "}
                        contracted across {peak.won} win
                        {peak.won === 1 ? "" : "s"}.
                      </>
                    ) : (
                      "Contracted value lands on the month the quote was accepted."
                    )}
                  </p>
                </>
              )}
            </div>
          </Panel>

          {/* delivered margin table */}
          <Panel
            icon={<Percent className="size-[15px]" />}
            title="Delivered margin"
            note={`${delivered.length} job${delivered.length === 1 ? "" : "s"} closed`}
            right={
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                derived live
              </span>
            }
            id="marginTable"
          >
            {delivered.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                Nothing delivered yet — margins land here when jobs close out.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-[minmax(128px,1.9fr)_88px_88px_88px_108px] items-center gap-x-2.5 border-b bg-muted/30 px-[18px] py-2.5">
                    {["Job", "Contract", "Spent", "Profit", "Margin"].map(
                      (h, i) => (
                        <span
                          key={h}
                          className={cn(
                            "text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                            i > 0 && "text-right",
                          )}
                        >
                          {h}
                        </span>
                      ),
                    )}
                  </div>
                  {delivered.map((j, i) => {
                    const profit = j.contracted - j.spent;
                    const margin = pct1(profit, j.contracted);
                    const under = margin < MARGIN_FLOOR;
                    return (
                      <Link
                        key={j.bidId}
                        href={`/projects/${j.bidId}`}
                        className={cn(
                          "grid grid-cols-[minmax(128px,1.9fr)_88px_88px_88px_108px] items-center gap-x-2.5 px-[18px] py-3 transition-colors hover:bg-muted/20",
                          i > 0 && "border-t border-border/60",
                          under && "shadow-[inset_3px_0_0] shadow-amber-500",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold">
                            {j.job}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {j.company}
                          </span>
                        </span>
                        <span className="text-right font-mono text-[13px] tabular-nums text-foreground/80">
                          {money.format(j.contracted)}
                        </span>
                        <span className="text-right font-mono text-[13px] tabular-nums text-foreground/80">
                          {money.format(j.spent)}
                        </span>
                        <span className="text-right font-mono text-[13px] font-medium tabular-nums">
                          {money.format(profit)}
                        </span>
                        <span className="flex items-center justify-end gap-2">
                          <span className="h-1.5 w-[46px] shrink-0 overflow-hidden rounded-full bg-muted">
                            <span
                              className={cn(
                                "block h-full rounded-full",
                                under ? "bg-amber-500" : "bg-emerald-600",
                              )}
                              style={{
                                width: `${Math.min((margin / 28) * 100, 100)}%`,
                              }}
                            />
                          </span>
                          <span
                            className={cn(
                              "w-[42px] text-right font-mono text-[13px] font-semibold tabular-nums",
                              under && "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {margin.toFixed(1)}%
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                  <div className="grid grid-cols-[minmax(128px,1.9fr)_88px_88px_88px_108px] items-center gap-x-2.5 border-t-2 bg-muted/20 px-[18px] py-3">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-bold">
                        Total delivered
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {underCount} of {delivered.length} job
                        {delivered.length === 1 ? "" : "s"} under {MARGIN_FLOOR}
                        %
                      </span>
                    </span>
                    <span className="text-right font-mono text-[13px] font-semibold tabular-nums">
                      {money.format(dContract)}
                    </span>
                    <span className="text-right font-mono text-[13px] font-semibold tabular-nums">
                      {money.format(dSpent)}
                    </span>
                    <span className="text-right font-mono text-[13px] font-semibold tabular-nums">
                      {money.format(dProfit)}
                    </span>
                    <span className="text-right font-mono text-[13px] font-semibold tabular-nums">
                      {dMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── right column ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* why deals declined */}
          <Panel
            icon={<MessageSquareQuote className="size-[15px]" />}
            title="Why quotes declined"
            note="newest first"
          >
            {declines.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                No declines recorded — when a customer turns a quote down,
                their reason lands here verbatim.
              </p>
            ) : (
              <>
                <div className="flex flex-col">
                  {declines.map((d, i) => (
                    <div
                      key={`${d.propertyName}-${d.declinedAt.getTime()}`}
                      className={cn(
                        "px-[18px] py-[15px]",
                        i > 0 && "border-t border-border/60",
                      )}
                    >
                      <div className="mb-0.5 flex items-baseline gap-2.5">
                        <span className="truncate text-[13.5px] font-semibold">
                          {d.propertyName}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/80">
                          {d.declinedAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{d.company}</span>
                        {d.value != null && (
                          <>
                            <span className="text-border">·</span>
                            <span className="font-mono tabular-nums text-muted-foreground/80">
                              {moneyK(d.value)} lost
                            </span>
                          </>
                        )}
                      </div>
                      <p
                        className={cn(
                          "border-l-2 pl-3 text-[13px] leading-relaxed",
                          d.hasReason
                            ? "border-border text-foreground/80"
                            : "border-border/60 italic text-muted-foreground/70",
                        )}
                      >
                        {d.reason}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-[18px] py-2.5 text-xs text-muted-foreground/80">
                  <Info className="size-3.5" />
                  {declinesWithReason} of {declines.length} decline
                  {declines.length === 1 ? "" : "s"} had a reason on record
                </div>
              </>
            )}
          </Panel>

          {/* funnels */}
          <Panel
            icon={<Filter className="size-[15px]" />}
            title="Funnels"
            note="conversion between stages"
          >
            {funnels.map((f, fi) => {
              const top = f.stages[0].count;
              const overall = pct(f.stages[f.stages.length - 1].count, top);
              return (
                <div
                  key={f.title}
                  className={cn(
                    "px-4 py-[15px]",
                    fi > 0 && "border-t border-border/60",
                  )}
                >
                  <div className="mb-3 flex items-baseline gap-2.5">
                    <span className="text-[13px] font-semibold">{f.title}</span>
                    <span className="hidden text-[11.5px] text-muted-foreground/80 sm:inline">
                      {f.sub}
                    </span>
                    <span className="ml-auto flex shrink-0 items-baseline gap-1">
                      <span className="font-mono text-[13px] font-semibold tabular-nums">
                        {overall}%
                      </span>
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                        end&#8209;to&#8209;end
                      </span>
                    </span>
                  </div>
                  {f.stages.map((s, si) => (
                    <div key={s.label}>
                      {si > 0 && (
                        <div className="grid h-5 grid-cols-[116px_1fr_30px] items-center gap-2.5">
                          <span className="col-start-2 inline-flex items-center gap-1 text-[10.5px] tabular-nums text-muted-foreground/70">
                            <CornerDownRight className="size-[11px]" />
                            {pct(s.count, f.stages[si - 1].count)}% carried
                            through
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-[116px_1fr_30px] items-center gap-2.5">
                        <span className="truncate text-xs text-foreground/80">
                          {s.label}
                        </span>
                        <span className="h-[22px] overflow-hidden rounded-md bg-muted/70">
                          <span
                            className={cn(
                              "block h-full rounded-md",
                              si === f.stages.length - 1
                                ? "bg-blue-600"
                                : "bg-foreground",
                            )}
                            style={{ width: `${pct(s.count, top)}%` }}
                          />
                        </span>
                        <span className="text-right font-mono text-xs font-medium tabular-nums">
                          {s.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </Panel>

          {/* lead sources — kept from the old page, restyled */}
          {data.sources.length > 0 && (
            <Panel
              icon={<Waypoints className="size-[15px]" />}
              title="Lead sources"
              note="by volume, with closed-won conversion"
            >
              <div className="flex flex-col px-1 py-1">
                {data.sources.map((s, i) => (
                  <div
                    key={s.sourceTag ?? "untagged"}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      i > 0 && "border-t border-border/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {s.sourceTag ?? (
                        <span className="italic text-muted-foreground">
                          Untagged
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {s.total} lead{s.total === 1 ? "" : "s"}
                    </span>
                    <span className="w-14 text-right font-mono text-xs font-medium tabular-nums">
                      {s.won > 0 ? `${pct(s.won, s.total)}% won` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  note,
  right,
  id,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string;
  right?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-4 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
    >
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-muted text-foreground/60">
          {icon}
        </span>
        <span className="shrink-0 text-[13.5px] font-semibold tracking-tight">
          {title}
        </span>
        {note && (
          <span className="min-w-0 truncate text-xs tabular-nums text-muted-foreground/80">
            · {note}
          </span>
        )}
        {right && <span className="ml-auto shrink-0">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  chip,
  hint,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  chip?: React.ReactNode;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border bg-card p-[16px_17px_13px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow,transform] hover:border-foreground/20 hover:shadow-[0_5px_18px_-8px_rgb(0_0_0/0.14)] active:translate-y-px"
    >
      <div className="mb-3.5 flex items-center gap-2">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-muted text-foreground/60">
          {icon}
        </span>
        <span className="text-[12.5px] font-semibold text-foreground/80">
          {label}
        </span>
        {chip && <span className="ml-auto">{chip}</span>}
      </div>
      {children}
      <div className="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-2.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-blue-700 dark:group-hover:text-blue-400 [&:not(:first-child)]:mt-3">
        {hint}
        <ArrowRight className="size-[13px] transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function StatValue({ big, small }: { big: string; small?: string }) {
  return (
    <div className="flex items-baseline gap-2 font-mono font-medium tabular-nums tracking-tight">
      <span className="text-[31px] leading-none">{big}</span>
      {small && (
        <span className="text-lg leading-none text-muted-foreground">
          {small}
        </span>
      )}
    </div>
  );
}

function StatSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs leading-snug text-muted-foreground">
      {children}
    </p>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "amber" | "plain";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-px text-[11.5px] font-semibold tabular-nums",
        tone === "amber"
          ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border bg-muted/60 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
