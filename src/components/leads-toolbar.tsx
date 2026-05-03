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
        aria-label="Import CSV"
        title="Import CSV"
        asChild
      >
        <Link href="/leads/import">
          <Download className="size-4" />
        </Link>
      </Button>
      <Button variant="amber" asChild>
        <Link href="/leads/new">New lead</Link>
      </Button>
    </PageHeaderActions>
  );
}
