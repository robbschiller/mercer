import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  FilePlus2,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { getBidsWithSummary } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  ActiveFilters,
  EmptyState,
  PageContainer,
  PageHeader,
  Pagination,
  FilterMenu,
  ResultSummary,
  SearchForm,
  SortableHeader,
  type SortDirection,
  TABLE_HEAD_CELL,
  TableControls,
  TableFrame,
} from "@/components/chrome";
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
  sent: "bg-info",
  won: "bg-success",
  lost: "bg-muted-foreground/40",
};

const PAGE_SIZE = 50;

const BID_SORTS = ["recent", "value", "name", "oldest"] as const;
type BidSort = (typeof BID_SORTS)[number];

function parseSort(raw: string | undefined): BidSort {
  const v = raw?.trim();
  return (BID_SORTS as readonly string[]).includes(v ?? "")
    ? (v as BidSort)
    : "recent";
}

function bidName(bid: BidSummary): string {
  return bid.label ?? bid.propertyName ?? bid.address ?? "";
}

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
  // Phase 2: a quote typed by hand beats the engine's estimate.
  if (bid.quoteAmount != null) {
    const n = Number(bid.quoteAmount);
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
  sort?: BidSort;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (patch.q) sp.set("q", patch.q);
  if (patch.status) sp.set("status", patch.status);
  if (patch.sort && patch.sort !== "recent") sp.set("sort", patch.sort);
  if (patch.page && patch.page > 1) sp.set("page", String(patch.page));
  const s = sp.toString();
  return s ? `/opportunities?${s}` : "/opportunities";
}

export default async function BidsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const q = (params.q ?? "").trim();
  const sort = parseSort(params.sort);
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

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "value":
        return (bidTotal(b) ?? 0) - (bidTotal(a) ?? 0);
      case "name":
        return bidName(a).localeCompare(bidName(b));
      case "oldest":
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      default:
        return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
  });

  const total = sorted.length;
  const offset = (page - 1) * PAGE_SIZE;
  const rows = sorted.slice(offset, offset + PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rows.length;
  const hasFilters = Boolean(q || status);

  const countFor = (s: BidStatus) => all.filter((b) => b.status === s).length;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={{ icon: <FileSpreadsheet className="size-3.5" />, label: "Quoting" }}
        title="Opportunities"
        description="Every scoped bid — from first takeoff to signed contract."
        actions={
          <Button asChild>
            <Link href="/opportunities/new">
              <FilePlus2 className="size-4" />
              New opportunity
            </Link>
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={<Calculator />}
          title="No opportunities yet"
          description="An opportunity is a scoped property with a number on it. Create one from a lead after the takeoff, or start one fresh from an address."
          actions={
            <Button asChild>
              <Link href="/opportunities/new">
                <FilePlus2 className="size-4" />
                New opportunity
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <TableControls
            summary={
              <ResultSummary
                start={rangeStart}
                end={rangeEnd}
                total={total}
                noun="opportunities"
              />
            }
          >
            <SearchForm
              action="/opportunities"
              q={q}
              placeholder="Search properties, accounts…"
              hidden={{ status, sort: sort !== "recent" ? sort : null }}
            />
            <FilterMenu
              activeCount={status ? 1 : 0}
              groups={[
                {
                  label: "Status",
                  options: [
                    {
                      label: "All statuses",
                      href: bidsHref({ q, sort }),
                      active: status == null,
                      count: all.length,
                    },
                    ...BID_STATUSES.map((st) => ({
                      label: bidStatusLabel(st),
                      href: bidsHref({ q, status: st, sort }),
                      active: status === st,
                      dot: STATUS_DOTS[st],
                      count: countFor(st),
                    })),
                  ],
                },
              ]}
            />
          </TableControls>

          <ActiveFilters
            items={
              status
                ? [
                    {
                      label: `Status: ${bidStatusLabel(status)}`,
                      href: bidsHref({ q, sort }),
                    },
                  ]
                : []
            }
          />

          {rows.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title={q ? `No opportunities match “${q}”` : "Nothing in this view"}
              description="No opportunities match the current filters. Clear them to see the full list."
              actions={
                hasFilters ? (
                  <Button variant="outline" asChild>
                    <Link href="/opportunities">Clear filters</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TableFrame minWidth="min-w-[940px]">
              <>
                <div className={cn("grid items-center gap-x-2.5 border-b bg-muted/30 py-2.5 pl-4 pr-10", GRID)}>
                  <BidSortHeader
                    q={q}
                    status={status}
                    sort={sort}
                    label="Opportunity"
                    to="name"
                    dir="asc"
                  />
                  {["Client", "Status", "Quote"].map((h) => (
                    <span key={h} className={TABLE_HEAD_CELL}>
                      {h}
                    </span>
                  ))}
                  <BidSortHeader
                    q={q}
                    status={status}
                    sort={sort}
                    label="Total"
                    to="value"
                    dir="desc"
                  />
                  <BidSortHeader
                    q={q}
                    status={status}
                    sort={sort}
                    label="Age"
                    to="recent"
                    dir="asc"
                    reverse="oldest"
                  />
                  <span className={TABLE_HEAD_CELL}>Next</span>
                </div>
                <div className="flex flex-col">
                  {rows.map((bid) => (
                    <BidRow key={bid.id} bid={bid} />
                  ))}
                </div>
              </>
            </TableFrame>
          )}

          <Pagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            hrefFor={(p) => bidsHref({ q, status, sort, page: p })}
          />
        </>
      )}
    </PageContainer>
  );
}

const GRID =
  "grid-cols-[minmax(180px,1.6fr)_minmax(110px,1fr)_100px_150px_80px_48px_minmax(120px,auto)]";

/** An opportunities column header bound to this page's query. */
function BidSortHeader({
  q,
  status,
  sort,
  label,
  to,
  dir,
  reverse,
}: {
  q: string;
  status: BidStatus | null;
  sort: BidSort;
  label: string;
  to: BidSort;
  dir: SortDirection;
  reverse?: BidSort;
}) {
  const isThis = sort === to;
  const isReverse = reverse != null && sort === reverse;
  const direction = isThis ? dir : isReverse ? (dir === "asc" ? "desc" : "asc") : null;
  const next = isThis && reverse != null ? reverse : to;
  return (
    <SortableHeader
      label={label}
      href={bidsHref({ q, status, sort: next })}
      direction={direction}
    />
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
                  <span className="font-semibold text-info-foreground">
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
        <ArrowRight className="size-3.5 text-info-foreground" />
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
