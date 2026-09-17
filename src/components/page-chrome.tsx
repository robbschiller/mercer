import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Page chrome — the one vocabulary every section page speaks.
 *
 * Index pages (Lists, Leads, Opportunities, Jobs): PageHeader with an eyebrow
 * naming the stage, a title, a one-line description, and the primary actions
 * on the right. Below it, FilterChips for status, then a Toolbar with the
 * search on the left and the result summary on the right, then the table,
 * then Pagination.
 *
 * Child pages (a list, a lead, an opportunity, a job, a "new …" form):
 * PageHeader with a BackLink to the parent section in place of the eyebrow,
 * the record's name as title, an optional status badge, and its actions.
 */

export function PageContainer({
  width = "wide",
  className,
  children,
}: {
  /** wide: tables and dashboards (1240). narrow: forms and intake (860). */
  width?: "wide" | "narrow";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full px-6 pb-24 pt-7",
        width === "wide" ? "max-w-[1240px]" : "max-w-[860px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Parent-section link on every child page. */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  back,
  title,
  badge,
  description,
  actions,
  className,
}: {
  /** Index pages: the stage this section is (icon + short label). */
  eyebrow?: { icon?: React.ReactNode; label: string };
  /** Child pages: the parent section to go back to. */
  back?: { href: string; label: string };
  title: React.ReactNode;
  /** Status pill rendered beside the title. */
  badge?: React.ReactNode;
  description?: React.ReactNode;
  /** Primary and secondary actions, right-aligned. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        {back ? (
          <BackLink href={back.href} label={back.label} className="mb-2.5" />
        ) : eyebrow ? (
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            {eyebrow.icon}
            {eyebrow.label}
          </p>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 truncate text-[27px] font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-[640px] text-[13.5px] text-muted-foreground [text-wrap:pretty]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

/** Error banner shared by every page that redirects back with ?error=. */
export function PageError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}

export function PageNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
      {children}
    </div>
  );
}

// ── Filters ────────────────────────────────────────────────────────────────

export function FilterChipRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap gap-2">{children}</div>;
}

export function FilterChip({
  href,
  active,
  label,
  count,
  dot,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
  /** Tailwind bg-* class for the status dot. */
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 text-[13.5px] font-medium transition-colors",
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
      {count != null && (
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            active ? "text-background/70" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/** Small segmented toggle (a view or a time window), sits in the Toolbar. */
export function Segmented({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex gap-0.5 rounded-[9px] border bg-muted/70 p-[3px]">
        {children}
      </div>
    </div>
  );
}

export function SegmentedLink({
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
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────

/** Controls on the left, the result summary on the right. */
export function Toolbar({
  children,
  summary,
}: {
  children?: React.ReactNode;
  summary?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-0.5">
      {children}
      {summary && (
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {summary}
        </span>
      )}
    </div>
  );
}

/**
 * GET search form. Extra filter controls go in as children; they add an
 * Apply button, since a select cannot submit on its own without JS.
 */
export function SearchForm({
  action,
  q,
  placeholder,
  hidden = {},
  children,
}: {
  action: string;
  q: string;
  placeholder: string;
  /** Current filters to preserve on submit. Nullish values are skipped. */
  hidden?: Record<string, string | number | null | undefined>;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([name, value]) =>
        value == null || value === "" ? null : (
          <input key={name} type="hidden" name={name} value={String(value)} />
        ),
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="h-9 w-64 rounded-[10px] border bg-card pl-9 pr-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
        />
      </div>
      {children}
      {children ? (
        <Button type="submit" variant="outline" className="h-9">
          Apply
        </Button>
      ) : null}
    </form>
  );
}

/** A select that matches the search input, for use inside SearchForm. */
export function ToolbarSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-[13.5px] font-medium text-foreground/80 outline-none transition-colors focus:border-foreground/30",
        props.className,
      )}
    />
  );
}

export function ResultSummary({
  start,
  end,
  total,
  noun,
  extra,
}: {
  start: number;
  end: number;
  total: number;
  /** Plural noun: "leads", "opportunities", "people". */
  noun: string;
  /** Anything after the count, e.g. "· $1.2M in contracts". */
  extra?: React.ReactNode;
}) {
  return (
    <>
      <b className="font-semibold text-foreground/80">
        {start}–{end}
      </b>{" "}
      of <b className="font-semibold text-foreground/80">{total}</b> {noun}
      {extra}
    </>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────

/** Rounded card that wraps a table or a grid list; scrolls sideways. */
export function TableFrame({
  minWidth,
  children,
}: {
  /** Tailwind min-w-* class for the inner scroll surface. */
  minWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className={minWidth}>{children}</div>
    </div>
  );
}

export const TABLE_HEAD_CELL =
  "text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

/** `<thead>` row styling for classic `<table>` layouts. */
export const TABLE_HEAD_ROW = cn("border-b bg-muted/30", TABLE_HEAD_CELL);

// ── Pagination ─────────────────────────────────────────────────────────────

export function Pagination({
  page,
  limit,
  total,
  hrefFor,
}: {
  page: number;
  limit: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (total <= limit) return null;
  const offset = (page - 1) * limit;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const pages = Math.max(1, Math.ceil(total / limit));
  const btn =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40";
  const off =
    "inline-flex h-8 items-center rounded-lg border bg-muted/30 px-3 text-xs font-medium text-muted-foreground/50";
  return (
    <div className="mt-4 flex items-center gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={btn}>
          ‹ Prev
        </Link>
      ) : (
        <span className={off}>‹ Prev</span>
      )}
      <span className="text-xs tabular-nums text-muted-foreground">
        Page <b className="font-semibold text-foreground/80">{page}</b> of{" "}
        {pages}
      </span>
      {end < total ? (
        <Link href={hrefFor(page + 1)} className={btn}>
          Next ›
        </Link>
      ) : (
        <span className={off}>Next ›</span>
      )}
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
        {start}–{end} of {total}
      </span>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60 [&_svg]:size-6">
        {icon}
      </span>
      <h3 className="mb-2 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
        {description}
      </p>
      {actions && <div className="mt-6 flex gap-2">{actions}</div>}
    </div>
  );
}
