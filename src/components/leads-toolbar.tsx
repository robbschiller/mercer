"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LeadsToolbar() {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
      <h1 className="text-3xl font-medium tracking-tight">Leads</h1>
      <div className="flex items-center gap-2">
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
