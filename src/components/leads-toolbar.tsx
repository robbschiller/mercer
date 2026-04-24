"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  query: string;
};

export function LeadsToolbar({ query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(query);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    if (value === query) return;
    const timer = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) sp.set("q", trimmed);
      else sp.delete("q");
      const qs = sp.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
    }, 200);
    return () => clearTimeout(timer);
  }, [value, query, pathname, router, searchParams]);

  return (
    <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
      <h1 className="text-3xl font-medium tracking-tight">Leads</h1>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-64 pl-8"
            aria-label="Search leads"
          />
        </div>
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
