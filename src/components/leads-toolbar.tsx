"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  view: "property" | "contact";
  query?: string;
};

export function LeadsToolbar({ view, query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(query ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(query ?? "");
  }, [query]);

  useEffect(() => {
    if (query === undefined || value === query) return;
    const timer = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) sp.set("q", trimmed);
      else sp.delete("q");
      sp.delete("page");
      const qs = sp.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
    }, 200);
    return () => clearTimeout(timer);
  }, [value, query, pathname, router, searchParams]);

  const buildViewHref = (next: "property" | "contact"): string => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "contact") sp.set("view", "contact");
    else sp.delete("view");
    sp.delete("page");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
      <h1 className="text-3xl font-medium tracking-tight">Leads</h1>
      <div className="flex items-center gap-2">
        <div
          className="inline-flex items-center rounded-md border bg-card p-0.5 text-xs"
          role="tablist"
          aria-label="Group leads by"
        >
          <Link
            href={buildViewHref("property")}
            scroll={false}
            role="tab"
            aria-selected={view === "property"}
            className={`rounded px-2.5 py-1 transition-colors ${
              view === "property"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By property
          </Link>
          <Link
            href={buildViewHref("contact")}
            scroll={false}
            role="tab"
            aria-selected={view === "contact"}
            className={`rounded px-2.5 py-1 transition-colors ${
              view === "contact"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By contact
          </Link>
        </div>
        {query !== undefined && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search leads..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-64 pl-8"
              aria-label="Search leads"
            />
          </div>
        )}
        <Button variant="outline" asChild>
          <Link href="/leads/import">Import CSV</Link>
        </Button>
        <Button variant="amber" asChild>
          <Link href="/leads/new">New lead</Link>
        </Button>
      </div>
    </div>
  );
}
