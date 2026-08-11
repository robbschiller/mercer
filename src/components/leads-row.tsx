"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Same click behaviour as {@link LeadsRow} for the grid-based property rows on
 * `/leads` — the whole row opens the lead, while the links inside it (property
 * record, account, contacts) still go where they say.
 */
export function LeadsGridRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div
      className={className}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("a, button, input, select, textarea, label")) return;
        startTransition(() => router.push(href, { scroll: false }));
      }}
    >
      {children}
    </div>
  );
}

export function LeadsRow({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <tr
      className={`cursor-pointer border-t transition-colors hover:bg-muted/40 ${
        active ? "bg-muted/60" : ""
      }`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        // Let native interactive elements (links, buttons, form controls)
        // handle their own clicks instead of routing twice.
        if (target.closest("a, button, input, select, textarea, label")) return;
        startTransition(() => router.push(href, { scroll: false }));
      }}
    >
      {children}
    </tr>
  );
}
