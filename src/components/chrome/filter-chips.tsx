import Link from "next/link";
import { cn } from "@/lib/utils";

/** Row of status/stage chips under the page header. */
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
  /** Tailwind bg-* class for the status dot (use a status token: bg-success). */
  dot?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-chip border px-3.5 text-body font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
      )}
    >
      {dot && (
        <span
          aria-hidden
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
