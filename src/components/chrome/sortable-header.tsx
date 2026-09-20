import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLE_HEAD_CELL } from "./table-frame";

export type SortDirection = "asc" | "desc";

/**
 * A column header that sorts the table.
 *
 * Sort belongs on the header, next to the data it orders, not in a control
 * above the table. Two rules keep it honest:
 *
 * 1. A header is a `SortableHeader` only when a server order already backs
 *    that column. A header that cannot sort must never look like it can, so
 *    everything else stays a plain `TABLE_HEAD_CELL` span.
 * 2. The arrow states the direction in force. At rest an unsorted column
 *    shows no arrow at all; the two-way arrow appears on hover and on
 *    keyboard focus, which is the only hint the header is interactive.
 *
 * `direction` is the direction currently in force for this column, or null
 * when some other column is the sorted one. `href` is where a click goes:
 * the reverse order when this column is sorted and has one, otherwise its
 * own order.
 */
export function SortableHeader({
  label,
  href,
  direction = null,
  align = "left",
}: {
  label: string;
  href: string;
  direction?: SortDirection | null;
  align?: "left" | "right";
}) {
  const active = direction != null;
  const Arrow = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <Link
      href={href}
      aria-label={
        active
          ? `${label}, sorted ${direction === "asc" ? "ascending" : "descending"}. Change sort.`
          : `Sort by ${label}`
      }
      className={cn(
        "group -mx-1.5 -my-0.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors",
        TABLE_HEAD_CELL,
        align === "right" ? "justify-end" : "justify-start",
        active
          ? "text-foreground"
          : "hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 focus-visible:text-foreground",
      )}
    >
      {label}
      <Arrow
        aria-hidden
        className={cn(
          "size-3 shrink-0",
          active
            ? "opacity-100"
            : "opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70",
        )}
      />
    </Link>
  );
}
