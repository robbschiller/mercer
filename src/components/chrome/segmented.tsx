import Link from "next/link";
import { cn } from "@/lib/utils";

/** Small segmented toggle (a view or a time window); sits in the Toolbar. */
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
        <span className="text-caption font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex gap-0.5 rounded-control border bg-muted/70 p-[3px]">
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
      aria-current={active ? "page" : undefined}
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
