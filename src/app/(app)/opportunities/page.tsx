import Link from "next/link";
import { getBidsWithSummary } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BidsTable } from "@/components/bids-table";
import { PageHeaderActions } from "@/components/page-header-actions";

export default async function BidsPage() {
  const bids = await getBidsWithSummary();

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full flex-col overflow-hidden">
      <PageHeaderActions>
        <Button variant="amber" size="sm" asChild>
          <Link href="/opportunities/new">New opportunity</Link>
        </Button>
      </PageHeaderActions>

      {bids.length === 0 ? (
        <div className="p-3 lg:p-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground">No opportunities yet.</p>
              <Button asChild>
                <Link href="/opportunities/new">Create your first opportunity</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <BidsTable bids={bids} />
      )}
    </div>
  );
}
