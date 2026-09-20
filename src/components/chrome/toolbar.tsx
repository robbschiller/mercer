import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
        />
        <input
          type="search"
          name="q"
          aria-label={placeholder}
          defaultValue={q}
          placeholder={placeholder}
          className="h-9 w-64 rounded-chip border bg-card pl-9 pr-3 text-body outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
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
export function ToolbarSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-chip border bg-card px-3 text-body font-medium text-foreground/80 outline-none transition-colors focus:border-foreground/30",
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
