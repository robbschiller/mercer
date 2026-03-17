import Link from "next/link";
import { getBidsWithSummary } from "@/lib/store";
import { formatCurrency } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  won: "default",
  lost: "secondary",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  won: "Won",
  lost: "Lost",
};

export default async function BidsPage() {
  const bids = await getBidsWithSummary();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bids</h1>
        <Button asChild>
          <Link href="/bids/new">New bid</Link>
        </Button>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bids.map((bid) => {
            const hasPrice =
              bid.coverageSqftPerGallon &&
              bid.pricePerGallon &&
              bid.laborRatePerUnit &&
              bid.totalSqft > 0;

            let grandTotal: number | null = null;
            if (hasPrice) {
              const coverage = Number(bid.coverageSqftPerGallon);
              const ppg = Number(bid.pricePerGallon);
              const labor = Number(bid.laborRatePerUnit);
              const margin = Number(bid.marginPercent ?? 0);
              const material = (bid.totalSqft / coverage) * ppg;
              const laborCost = bid.totalSqft * labor;
              const subtotal = material + laborCost;
              grandTotal = subtotal + subtotal * (margin / 100);
            }

            return (
              <Link key={bid.id} href={`/bids/${bid.id}`}>
                <Card className="hover:border-foreground/20 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {bid.propertyName}
                      </CardTitle>
                      <Badge
                        variant={statusVariant[bid.status] ?? "secondary"}
                      >
                        {statusLabels[bid.status] ?? bid.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {bid.clientName} &middot; {bid.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {bid.buildingCount === 0
                            ? "No buildings"
                            : `${bid.buildingCount} building${bid.buildingCount !== 1 ? "s" : ""}`}
                        </span>
                        {bid.totalSqft > 0 && (
                          <span className="tabular-nums">
                            {bid.totalSqft.toLocaleString()} sqft
                          </span>
                        )}
                      </div>

                      {grandTotal != null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Bid total
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(grandTotal)}
                          </span>
                        </div>
                      )}

                      {bid.lastProposalAt && (
                        <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                          Proposal sent{" "}
                          {bid.lastProposalAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
