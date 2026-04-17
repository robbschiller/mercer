"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/view-mode";

/**
 * Segmented icon control that toggles between card view and table view by
 * writing `?view=cards|table` into the URL. Keeps pages server-rendered and
 * makes the current view shareable/bookmarkable.
 */
export function ViewModeToggle({ current }: { current: ViewMode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    // `cards` is the default — omit the param to keep the URL clean.
    if (mode === "cards") params.delete("view");
    else params.set("view", mode);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-background p-0.5"
    >
      <ToggleItem
        label="Card view"
        href={hrefFor("cards")}
        active={current === "cards"}
        icon={LayoutGrid}
      />
      <ToggleItem
        label="Table view"
        href={hrefFor("table")}
        active={current === "table"}
        icon={Rows3}
      />
    </div>
  );
}

function ToggleItem({
  label,
  href,
  active,
  icon: Icon,
}: {
  label: string;
  href: string;
  active: boolean;
  icon: typeof LayoutGrid;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-pressed={active}
      title={label}
      prefetch={false}
      replace
      scroll={false}
      className={cn(
        "inline-flex h-7 w-8 items-center justify-center rounded-sm transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </Link>
  );
}
