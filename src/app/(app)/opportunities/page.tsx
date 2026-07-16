import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  FilePlus2,
  Search,
} from "lucide-react";
import { getBidsWithSummary } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  BID_STATUSES,
  bidStatusLabel,
  type BidStatus,
} from "@/lib/status-meta";
import { calculateBidPricing } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type BidSummary = Awaited<ReturnType<typeof getBidsWithSummary>>[number];

// Dot colors mirror Pipeline's STAGE_DOTS vocabulary: sent blue, won
// emerald, draft/lost muted. Labels always via status-meta.
const STATUS_DOTS: Record<BidStatus, string> = {
  draft: "bg-muted-foreground/40",
  sent: "bg-blue-600",
  won: "bg-emerald-600",
  lost: "bg-muted-foreground/40",
};

const PAGE_SIZE = 50;

function compactMoney(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function bidTotal(bid: BidSummary): number | null {
  // Won bids carry the immutable contract baseline; everything else shows
  // the live computed quote total (same math the old table used).
  if (bid.status === "won" && bid.contractValue != null) {
    const n = Number(bid.contractValue);
    if (Number.isFinite(n)) return n;
  }
  const pricing = calculateBidPricing({
    totalSqft: bid.totalSqft,
    coverageSqftPerGallon: bid.coverageSqftPerGallon
      ? Number(bid.coverageSqftPerGallon)
      : null,
    pricePerGallon: bid.pricePerGallon ? Number(bid.pricePerGallon) : null,
    laborRatePerUnit: bid.laborRatePerUnit
      ? Number(bid.laborRatePerUnit)
      : null,
    marginPercent: bid.marginPercent ? Number(bid.marginPercent) : null,
    lineItems: [],
  });
  return pricing.grandTotal;
}

function ageDays(d: Date): number {
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
}

function parseStatus(raw: string | undefined): BidStatus | null {
  const v = raw?.trim();
  if (!v) return null;
  return (BID_STATUSES as readonly string[]).includes(v)
    ? (v as BidStatus)
    : null;
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return n;
}

function bidsHref(patch: {
  q?: string;
  status?: BidStatus | null;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (patch.q) sp.set("q", patch.q);
  if (patch.status) sp.set("status", patch.status);
  if (patch.page && patch.page > 1) sp.set("page", String(patch.page));
  const s = sp.toString();
  return s ? `/opportunities?${s}` : "/opportunities";
}

export default async function BidsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const q = (params.q ?? "").trim();
  const page = parsePage(params.page);

  const all = await getBidsWithSummary();

  const needle = q.toLowerCase();
  const filtered = all.filter((bid) => {
    if (status && bid.status !== status) return false;
    if (!needle) return true;
    return [bid.propertyName, bid.clientName, bid.label, bid.address].some(
      (v) => v?.toLowerCase().includes(needle),
    );
  });

  const total = filtered.length;
  const offset = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(offset, offset + PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rows.length;
  const hasFilters = Boolean(q || status);

  const countFor = (s: BidStatus) => all.filter((b) => b.status === s).length;

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      {/* header */}
      <header className="mb-5 flex items-end gap-5">
        <div>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Opportunities
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Every scoped bid — from first takeoff to signed contract.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button asChild>
            <Link href="/opportunities/new">
              <FilePlus2 className="size-4" />
              New opportunity
            </Link>
          </Button>
        </div>
      </header>

      {all.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60">
            <Calculator className="size-6" />
          </span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">
            No opportunities yet
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
            An opportunity is a scoped property with a number on it. Create
            one from a lead after the takeoff, or start one fresh from an
            address.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link href="/opportunities/new">
                <FilePlus2 className="size-4" />
                New opportunity
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* status rail */}
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusChip
              href={bidsHref({ q })}
              active={status == null}
              label="All"
              count={all.length}
            />
            {BID_STATUSES.map((s) => (
              <StatusChip
                key={s}
                href={bidsHref({ q, status: s })}
                active={status === s}
                label={bidStatusLabel(s)}
                count={countFor(s)}
                dot={STATUS_DOTS[s]}
              />
            ))}
          </div>

          {/* search + result meta */}
          <div className="mb-2 flex flex-wrap items-center gap-3.5 px-0.5">
            <form action="/opportunities" className="relative">
              {status && <input type="hidden" name="status" value={status} />}
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search properties, clients…"
                className="h-9 w-56 rounded-[10px] border bg-card pl-9 pr-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
              />
            </form>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              <b className="font-semibold text-foreground/80">
                {rangeStart}–{rangeEnd}
              </b>{" "}
              of <b className="font-semibold text-foreground/80">{total}</b>{" "}
              opportunities
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60">
                <Search className="size-6" />
              </span>
              <h3 className="mb-2 text-xl font-semibold tracking-tight">
                {q ? `No opportunities match “${q}”` : "Nothing in this view"}
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
                No opportunities match the current filters. Clear them to see
                the full list.
              </p>
              {hasFilters && (
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/opportunities">Clear filters</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <div className="min-w-[940px]">
                <div className={cn("grid items-center gap-x-2.5 border-b bg-muted/30 py-2.5 pl-4 pr-10", GRID)}>
                  {[
                    "Opportunity",
                    "Client",
                    "Status",
                    "Quote",
                    "Total",
                    "Age",
                    "Next",
                  ].map((h) => (
                    <span
                      key={h}
                      className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col">
                  {rows.map((bid) => (
                    <BidRow key={bid.id} bid={bid} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* pagination */}
          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center gap-3">
              {page > 1 ? (
                <Link
                  href={bidsHref({ q, status, page: page - 1 })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40"
                >
                  ‹ Prev
                </Link>
              ) : (
                <span className="inline-flex h-8 items-center rounded-lg border bg-muted/30 px-3 text-xs font-medium text-muted-foreground/50">
                  ‹ Prev
                </span>
              )}
              {rangeEnd < total ? (
                <Link
                  href={bidsHref({ q, status, page: page + 1 })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40"
                >
                  Next ›
                </Link>
              ) : (
                <span className="inline-flex h-8 items-center rounded-lg border bg-muted/30 px-3 text-xs font-medium text-muted-foreground/50">
                  Next ›
                </span>
              )}
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {rangeStart}–{rangeEnd} of {total}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const GRID =
  "grid-cols-[minmax(180px,1.6fr)_minmax(110px,1fr)_100px_150px_80px_48px_minmax(120px,auto)]";

function StatusChip({
  href,
  active,
  label,
  count,
  dot,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 text-[13.5px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            active ? "bg-background/80" : dot,
          )}
        />
      )}
      {label}
      <span
        className={cn(
          "font-semibold tabular-nums",
          active ? "text-background/90" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

function BidRow({ bid }: { bid: BidSummary }) {
  const href = `/opportunities/${bid.id}`;
  const total = bidTotal(bid);
  return (
    <div
      className={cn(
        "group relative grid items-center gap-x-2.5 border-t py-3 pl-4 pr-10 transition-colors first:border-t-0 hover:bg-muted/20",
        GRID,
      )}
    >
      {/* opportunity */}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold tracking-tight">
          <Link href={href} className="hover:underline">
            {bid.label ?? bid.propertyName ?? "Untitled opportunity"}
          </Link>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {bid.label ? (bid.propertyName || bid.address || "—") : bid.address || "—"}
        </div>
      </div>
      {/* client */}
      <div className="truncate text-[13px] text-foreground/80">
        {bid.clientName || (
          <span className="italic text-muted-foreground/70">Private owner</span>
        )}
      </div>
      {/* status */}
      <div>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-muted/50 py-[3px] pl-2 pr-2.5 text-xs font-medium text-foreground/80">
          <span
            className={cn("size-1.5 rounded-full", STATUS_DOTS[bid.status])}
          />
          {bidStatusLabel(bid.status)}
        </span>
      </div>
      {/* quote */}
      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
        {bid.quote ? (
          <>
            <span className="rounded-[5px] bg-muted px-1.5 py-px font-mono text-[11px] font-medium text-muted-foreground">
              v{bid.quote.version}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-medium capitalize text-foreground/80">
              {bid.quote.status}
            </span>
            {bid.status === "sent" && (
              <>
                <span className="text-muted-foreground/50">·</span>
                {bid.quote.viewCount > 0 ? (
                  <span className="font-semibold text-blue-600">
                    Viewed {bid.quote.viewCount}×
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">Not opened</span>
                )}
              </>
            )}
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>
      {/* total */}
      <div
        className={cn(
          "font-mono text-[13px] font-medium tabular-nums",
          total == null && "font-sans text-muted-foreground/60",
        )}
      >
        {total == null ? "—" : compactMoney(total)}
      </div>
      {/* age */}
      <div className="font-mono text-xs tabular-nums text-muted-foreground">
        {ageDays(bid.updatedAt)}d
      </div>
      {/* next */}
      <div className="flex items-center">
        <NextCell bid={bid} />
      </div>
      {/* hover open */}
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <Link
          href={href}
          title="Open"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function NextCell({ bid }: { bid: BidSummary }) {
  if (bid.status === "draft") {
    return (
      <Link
        href={`/opportunities/${bid.id}#quote`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background [&:hover_svg]:text-background"
      >
        Build quote
        <ArrowRight className="size-3.5 text-blue-600" />
      </Link>
    );
  }
  if (bid.status === "sent") {
    return (
      <Link
        href={`/opportunities/${bid.id}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Open
      </Link>
    );
  }
  if (bid.status === "won") {
    return (
      <Link
        href={`/projects/${bid.id}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
      >
        Open job
      </Link>
    );
  }
  return null;
}
