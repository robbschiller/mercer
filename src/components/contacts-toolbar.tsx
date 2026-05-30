"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeaderActions } from "@/components/page-header-actions";

export function ContactsToolbar() {
  return (
    <PageHeaderActions>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        aria-label="Import contacts CSV"
        title="Import contacts CSV"
        asChild
      >
        <Link href="/contacts/import">
          <Download className="size-3.5" />
        </Link>
      </Button>
      <Button variant="amber" size="sm" asChild>
        <Link href="/contacts/new">New contact</Link>
      </Button>
    </PageHeaderActions>
  );
}
