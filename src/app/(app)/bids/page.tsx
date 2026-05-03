import Link from "next/link";
import { getBidsWithSummary } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BidsTable } from "@/components/bids-table";
import { PageHeaderActions } from "@/components/page-header-actions";

export default async function BidsPage() {
  const bids = await getBidsWithSummary();

  return (
    <div className="container mx-auto p-4">
      <PageHeaderActions>
        <Button variant="amber" asChild>
          <Link href="/bids/new">New bid</Link>
        </Button>
      </PageHeaderActions>

      {bids.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">No bids yet.</p>
            <Button asChild>
              <Link href="/bids/new">Create your first bid</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <BidsTable bids={bids} />
      )}
    </div>
  );
}
