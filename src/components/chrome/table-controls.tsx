import Link from "next/link";
import { X } from "lucide-react";

/**
 * The control bar above a table.
 *
 * One row, two clusters. `children` is the left cluster and holds the
 * search field and a `FilterMenu`. The right cluster holds the optional
 * `view` toggle and the result `summary`.
 *
 * Two controls, and no more. EVERY filter, status included, collapses into
 * the filter menu, and whatever is applied is echoed back by
 * `ActiveFilters` underneath. Sort is not in the bar at all: it lives on
 * the column headers (`SortableHeader`), next to the data it orders.
 *
 * That keeps the row a fixed width no matter how long the data's option
 * labels get, which is the failure mode of putting a native `<select>` of
 * user data directly in the bar.
 */
export function TableControls({
  children,
  view,
  summary,
}: {
  children?: React.ReactNode;
  /** Primary view toggle (a `Segmented`), right-aligned. */
  view?: React.ReactNode;
  summary?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-0.5">
      {children}
      {(view || summary) && (
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {view}
          {summary && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {summary}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export type ActiveFilter = {
  /** What is applied, e.g. "Source: Trade show". */
  label: string;
  /** Href with this one filter removed. */
  href: string;
};

/**
 * Echoes the filters hidden inside `FilterMenu` back onto the page, each
 * removable. Renders nothing when no filter is applied, so the row costs
 * no vertical space in the default view.
 */
export function ActiveFilters({
  items,
  clearHref,
}: {
  items: ActiveFilter[];
  /** Href with every filter cleared. Shown once two or more are applied. */
  clearHref?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 px-0.5">
      <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Filtered by
      </span>
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group inline-flex h-7 items-center gap-1.5 rounded-full border bg-card pl-2.5 pr-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40"
        >
          {item.label}
          <span
            aria-hidden
            className="grid size-4 place-items-center rounded-full text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background"
          >
            <X className="size-3" />
          </span>
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
      {clearHref && items.length > 1 && (
        <Link
          href={clearHref}
          className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}
