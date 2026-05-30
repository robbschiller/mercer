import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeaderActions } from "@/components/page-header-actions";

export function LeadsToolbar() {
  return (
    <PageHeaderActions>
      <Button variant="amber" size="sm" asChild>
        <Link href="/leads/new">New lead</Link>
      </Button>
    </PageHeaderActions>
  );
}
