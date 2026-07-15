import Link from "next/link";
import {
  ArrowDownNarrowWide,
  ArrowRight,
  Briefcase,
  Building,
  Building2,
  CirclePlus,
  FolderTree,
  History,
  Landmark,
  MapPin,
  PaintRoller,
  User,
} from "lucide-react";
import { getPropertiesRegister, type PropertyRegisterRow } from "@/lib/store";
import { projectStatusLabel, type ProjectStatus } from "@/lib/status-meta";
import { cn } from "@/lib/utils";

function moneyK(n: number | null): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

/**
 * Repeat business is the whole game: exteriors get repainted on a cycle.
 * A property whose last won job is 6+ years old — with nothing live on the
 * books — is due for a call.
 */
const REPAINT_CYCLE_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;

type Register = PropertyRegisterRow & {
  repaintDue: boolean;
  hasOpenDeal: boolean;
  dealNote: string | null;
};

function enrich(p: PropertyRegisterRow): Register {
  const hasOpenDeal =
    p.openLeadCount > 0 || p.openBidCount > 0 || p.activeJobStatus != null;
  const repaintDue =
    !hasOpenDeal &&
    p.lastWonAt != null &&
    Date.now() - p.lastWonAt.getTime() > REPAINT_CYCLE_MS;
  let dealNote: string | null = null;
  if (p.activeJobStatus) {
    dealNote = `Job ${projectStatusLabel(p.activeJobStatus as ProjectStatus).toLowerCase()}`;
  } else if (p.openBidCount > 0) {
    dealNote = `${p.openBidCount} open bid${p.openBidCount === 1 ? "" : "s"}`;
  } else if (p.openLeadCount > 0) {
    dealNote = `${p.openLeadCount} open lead${p.openLeadCount === 1 ? "" : "s"}`;
  }
  return { ...p, repaintDue, hasOpenDeal, dealNote };
}

const FILTERS = ["all", "open", "due"] as const;
type Filter = (typeof FILTERS)[number];

function fmtWhen(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; group?: string }>;
}) {
  const { show, group } = await searchParams;
  const filter: Filter = FILTERS.includes(show as Filter)
    ? (show as Filter)
    : "all";
  const grouped = group === "mgmt";

  const all = (await getPropertiesRegister()).map(enrich);
  // Repaint-due first — those are the calls that mint the next deal.
  all.sort((a, b) => Number(b.repaintDue) - Number(a.repaintDue));

  const counts = {
    all: all.length,
    open: all.filter((p) => p.hasOpenDeal).length,
    due: all.filter((p) => p.repaintDue).length,
  };
  const rows = grouped
    ? all
    : filter === "open"
      ? all.filter((p) => p.hasOpenDeal)
      : filter === "due"
        ? all.filter((p) => p.repaintDue)
        : all;
  const lifetime = rows.reduce((n, p) => n + p.lifetime, 0);

  // Portfolio grouping: management company is the account; HOA/self-managed
  // and private owners pool at the bottom.
  const portfolios = new Map<string, Register[]>();
  if (grouped) {
    for (const p of all) {
      const key = p.managementName ?? "Self-managed & private";
      portfolios.set(key, [...(portfolios.get(key) ?? []), p]);
    }
  }
  const portfolioCount = new Map<string, number>();
  for (const p of all) {
    if (p.managementName) {
      portfolioCount.set(
        p.managementName,
        (portfolioCount.get(p.managementName) ?? 0) + 1,
      );
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <header className="mb-5 flex items-end gap-5">
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            <Building2 className="size-3.5" />
            The asset register
          </p>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Properties
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Buildings outlast every deal and every management company. This is
            where repeat work is born.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/leads/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <CirclePlus className="size-3.5" />
            New lead
          </Link>
        </div>
      </header>

      {all.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60">
            <Building2 className="size-6" />
          </span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">
            No properties yet
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Properties are the durable records — every lead, bid, and job at an
            address builds its history here.
          </p>
          <Link
            href="/leads/new"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted"
          >
            Add a lead
          </Link>
        </div>
      ) : (
        <>
          {/* filter chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Chip href="/properties" active={filter === "all" && !grouped}>
              All
              <Count n={counts.all} />
            </Chip>
            <Chip href="/properties?show=open" active={filter === "open" && !grouped}>
              Has open deal
              <Count n={counts.open} />
            </Chip>
            <Chip href="/properties?show=due" active={filter === "due" && !grouped}>
              Repaint due
              <Count n={counts.due} />
            </Chip>
            <Chip href="/properties?group=mgmt" active={grouped} className="ml-auto">
              <FolderTree className="size-3.5 text-muted-foreground" />
              By management co.
            </Chip>
          </div>

          {/* toolbar */}
          <div className="mb-3 flex items-center gap-3 px-0.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {grouped ? (
                <>
                  <FolderTree className="size-3.5" />
                  Grouped{" "}
                  <b className="font-semibold text-foreground/80">
                    by management company
                  </b>
                </>
              ) : (
                <>
                  <ArrowDownNarrowWide className="size-3.5" />
                  Sorted{" "}
                  <b className="font-semibold text-foreground/80">
                    repaint-due first
                  </b>
                </>
              )}
            </span>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {counts.due > 0 && (
                <>
                  <b className="font-semibold text-foreground/80">
                    {counts.due}
                  </b>{" "}
                  repaint due ·{" "}
                </>
              )}
              <b className="font-semibold text-foreground/80">{rows.length}</b>{" "}
              propert{rows.length === 1 ? "y" : "ies"} ·{" "}
              <b className="font-semibold text-foreground/80">
                {moneyK(lifetime)}
              </b>{" "}
              lifetime
            </span>
          </div>

          {grouped ? (
            [...portfolios.entries()].map(([name, list]) => (
              <section key={name} className="mb-6">
                <div className="mb-3 flex items-center gap-2.5 px-1">
                  <span className="flex size-[26px] items-center justify-center rounded-lg bg-muted text-foreground/60">
                    {name === "Self-managed & private" ? (
                      <Landmark className="size-[15px]" />
                    ) : (
                      <Building className="size-[15px]" />
                    )}
                  </span>
                  <span className="text-[14.5px] font-semibold tracking-tight">
                    {name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    ×{list.length}
                  </span>
                  <span className="flex-1" />
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {moneyK(list.reduce((n, p) => n + p.lifetime, 0))} lifetime
                  </span>
                  {list.filter((p) => p.repaintDue).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-px text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
                      <PaintRoller className="size-3" />
                      {list.filter((p) => p.repaintDue).length} repaint due
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {list.map((p) => (
                    <PropertyCard key={p.id} p={p} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((p) => (
                <PropertyCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  function PropertyCard({ p }: { p: Register }) {
    const label = p.name ?? p.address ?? "Untitled property";
    return (
      <Link
        href={`/properties/${p.id}`}
        className={cn(
          "grid grid-cols-1 gap-5 rounded-2xl border bg-card p-[17px_19px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow,transform] hover:border-foreground/20 hover:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.12)] active:translate-y-px md:grid-cols-[minmax(0,1fr)_288px]",
          p.repaintDue && "border-l-[3px] border-l-amber-500",
        )}
      >
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <span className="truncate text-[16.5px] font-semibold tracking-tight">
              {label}
            </span>
            {p.repaintDue ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-[3px] text-xs font-semibold text-amber-700 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Repaint due
              </span>
            ) : p.hasOpenDeal ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-[3px] text-xs font-semibold text-blue-700 dark:text-blue-400">
                <span className="size-1.5 rounded-full bg-blue-600" />
                Active deal
              </span>
            ) : null}
            {p.managementName &&
              (portfolioCount.get(p.managementName) ?? 0) > 1 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-[3px] text-[11px] font-semibold text-foreground/70">
                  {p.managementName.split(" ")[0]} ×
                  {portfolioCount.get(p.managementName)}
                </span>
              )}
          </div>
          {p.name && p.address && (
            <p className="mb-3 flex items-center gap-1.5 truncate text-[13px] text-muted-foreground">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
              {p.address}
            </p>
          )}
          <p className="mb-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-foreground/80">
            {p.managementName ? (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Building className="size-3.5 text-muted-foreground/70" />
                {p.managementName}
                {p.mgmtSinceYear && (
                  <span className="font-normal text-muted-foreground/80">
                    since {p.mgmtSinceYear}
                  </span>
                )}
              </span>
            ) : p.ownerName ? (
              <span className="inline-flex items-center gap-1.5 font-medium">
                {p.ownerType === "owner" ? (
                  <User className="size-3.5 text-muted-foreground/70" />
                ) : (
                  <Briefcase className="size-3.5 text-muted-foreground/70" />
                )}
                {p.ownerName}
              </span>
            ) : (
              <span className="italic text-muted-foreground/70">
                No management on file
              </span>
            )}
            <span className="text-border">·</span>
            <span className="text-muted-foreground">
              {p.sqftNonfloor
                ? `${Math.round(p.sqftNonfloor).toLocaleString()} sqft paintable`
                : `${p.contactCount} contact${p.contactCount === 1 ? "" : "s"}`}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              <b className="font-mono font-medium tabular-nums text-foreground">
                {p.jobCount}
              </b>
              job{p.jobCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              <b className="font-mono font-medium tabular-nums text-foreground">
                {moneyK(p.lifetime)}
              </b>
              lifetime
            </span>
            {p.openBidCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600/20 bg-blue-600/10 px-2.5 py-1 text-xs text-blue-700 dark:text-blue-400">
                <span className="size-1.5 rounded-full bg-blue-600" />
                <b className="font-mono font-medium tabular-nums">
                  {p.openBidCount}
                </b>
                open bid{p.openBidCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* side rail */}
        <div className="flex flex-col gap-2.5 border-t pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <History className="size-3.5" />
            Last activity · {fmtWhen(p.lastActivityAt)}
          </p>
          {p.repaintDue && p.lastWonAt ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <PaintRoller className="size-3.5" />
                  Repaint due
                </span>
                <span className="rounded-md bg-amber-500/15 px-1.5 py-px font-mono text-[11.5px] font-medium text-amber-700 dark:text-amber-400">
                  {Math.floor(
                    (Date.now() - p.lastWonAt.getTime()) /
                      (365.25 * 86_400_000),
                  )}{" "}
                  yrs
                </span>
              </div>
              <p className="mb-2.5 text-xs text-foreground/80">
                Last painted{" "}
                <b className="font-semibold">
                  {p.lastWonAt.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </b>
                {p.lastWonValue != null && <> · {moneyK(p.lastWonValue)}</>}
              </p>
              <span className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-[12.5px] font-medium text-amber-800 dark:text-amber-300">
                <CirclePlus className="size-3.5" />
                Start lead
              </span>
            </div>
          ) : p.dealNote ? (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-2.5 flex items-center gap-2 text-[12.5px] font-medium text-foreground/80">
                <span className="size-[7px] shrink-0 rounded-full bg-blue-600 shadow-[0_0_0_3px] shadow-blue-600/15" />
                {p.dealNote}
              </p>
              <span className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-lg border bg-card text-[12.5px] font-medium text-foreground/80">
                <ArrowRight className="size-3.5" />
                Open hub
              </span>
            </div>
          ) : (
            <span className="mt-auto inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-lg border bg-card text-[12.5px] font-medium text-foreground/80">
              <ArrowRight className="size-3.5" />
              Open hub
            </span>
          )}
        </div>
      </Link>
    );
  }
}

function Chip({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3 text-[13.5px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background [&_span]:!text-background/80 [&_svg]:!text-background/80"
          : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="font-semibold tabular-nums text-muted-foreground">
      {n}
    </span>
  );
}
