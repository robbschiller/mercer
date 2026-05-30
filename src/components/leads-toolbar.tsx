"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderActions } from "@/components/page-header-actions";

export function LeadsToolbar() {
  return (
    <PageHeaderActions>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        aria-label="Import CSV"
        title="Import CSV"
        asChild
      >
        <Link href="/leads/import">
          <Download className="size-3.5" />
        </Link>
      </Button>
      <Button variant="amber" size="sm" asChild>
        <Link href="/leads/new">New lead</Link>
      </Button>
    </PageHeaderActions>
  );
}
