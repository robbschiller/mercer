"use client";

import Link from "next/link";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The filter menu that sits in a `TableControls` bar. It is a client leaf
 * only because Radix needs to own focus, Escape and click-outside; the
 * options inside are ordinary links, so the filtered URL is shareable and
 * the back button works. Sort is not here — it lives on the column headers
 * (`SortableHeader`).
 */

export type MenuOption = {
  label: string;
  href: string;
  active: boolean;
  /** Tailwind bg-* class for a leading dot, e.g. a status tone. */
  dot?: string;
  /** Right-aligned count. */
  count?: number;
};

export type MenuGroup = {
  label: string;
  options: MenuOption[];
};

const TRIGGER =
  "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-chip border bg-card px-3 text-body font-medium text-foreground/80 outline-none transition-colors hover:border-foreground/25 hover:bg-muted/40 data-[state=open]:border-foreground/30";

function OptionList({ groups }: { groups: MenuGroup[] }) {
  return (
    <>
      {groups.map((group, i) => (
        <div key={group.label}>
          {i > 0 && <DropdownMenuSeparator />}
          <DropdownMenuLabel className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {group.label}
          </DropdownMenuLabel>
          {group.options.map((opt) => (
            <DropdownMenuItem key={opt.label} asChild className="gap-2">
              <Link href={opt.href}>
                {opt.dot ? (
                  <span
                    aria-hidden
                    className={cn("size-1.5 shrink-0 rounded-full", opt.dot)}
                  />
                ) : null}
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.count != null && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {opt.count}
                  </span>
                )}
                <Check
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0",
                    opt.active ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      ))}
    </>
  );
}

/** Secondary filters, collapsed. The trigger carries the applied count. */
export function FilterMenu({
  groups,
  activeCount = 0,
  label = "Filters",
}: {
  groups: MenuGroup[];
  activeCount?: number;
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(TRIGGER, activeCount > 0 && "border-foreground/30")}
      >
        <SlidersHorizontal aria-hidden className="size-3.5" />
        {label}
        {activeCount > 0 && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-2xs font-semibold tabular-nums text-background">
            {activeCount}
          </span>
        )}
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 rounded-chip">
        <OptionList groups={groups} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
