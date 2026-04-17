import Link from "next/link";
import { getBidsWithSummary } from "@/lib/store";
import { calculateBidPricing, formatCurrency } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { parseViewMode } from "@/lib/view-mode";

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

type BidSummary = Awaited<ReturnType<typeof getBidsWithSummary>>[number];

function computeBidTotal(bid: BidSummary): number | null {
  const pricing = calculateBidPricing({
    totalSqft: bid.totalSqft,
    coverageSqftPerGallon: bid.coverageSqftPerGallon
      ? Number(bid.coverageSqftPerGallon)
      : null,
    pricePerGallon: bid.pricePerGallon ? Number(bid.pricePerGallon) : null,
    laborRatePerUnit: bid.laborRatePerUnit
      ? Number(bid.laborRatePerUnit)
      : null,
    marginPercent: bid.marginPercent ? Number(bid.marginPercent) : null,
    lineItems: [],
  });
  return pricing.grandTotal;
}

function formatShortDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function BidsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = parseViewMode(viewParam);
  const bids = await getBidsWithSummary();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold">Bids</h1>
        <div className="flex items-center gap-2">
          <ViewModeToggle current={view} />
          <Button asChild>
            <Link href="/bids/new">New bid</Link>
          </Button>
        </div>
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
      ) : view === "table" ? (
        <BidsTable bids={bids} />
      ) : (
        <BidsCards bids={bids} />
      )}
    </div>
  );
}

function BidsCards({ bids }: { bids: BidSummary[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bids.map((bid) => {
        const grandTotal = computeBidTotal(bid);
        return (
          <Link key={bid.id} href={`/bids/${bid.id}`}>
            <Card className="hover:border-foreground/20 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{bid.propertyName}</CardTitle>
                  <Badge variant={statusVariant[bid.status] ?? "secondary"}>
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
                      <span className="text-muted-foreground">Bid total</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  )}

                  {bid.lastProposalAt && (
                    <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                      Proposal sent {formatShortDate(bid.lastProposalAt)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function BidsTable({ bids }: { bids: BidSummary[] }) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="text-left">
              <Th>Property</Th>
              <Th>Client</Th>
              <Th>Address</Th>
              <Th align="right">Buildings</Th>
              <Th align="right">Sqft</Th>
              <Th align="right">Bid total</Th>
              <Th>Status</Th>
              <Th>Proposal</Th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => {
              const grandTotal = computeBidTotal(bid);
              return (
                <tr
                  key={bid.id}
                  className="relative border-t transition-colors hover:bg-muted/40"
                >
                  <Td>
                    <Link
                      href={`/bids/${bid.id}`}
                      className="font-medium text-foreground before:absolute before:inset-0 before:content-['']"
                    >
                      {bid.propertyName}
                    </Link>
                  </Td>
                  <Td muted>{bid.clientName}</Td>
                  <Td muted>
                    <span className="block max-w-[22ch] truncate">
                      {bid.address}
                    </span>
                  </Td>
                  <Td align="right" numeric>
                    {bid.buildingCount || "—"}
                  </Td>
                  <Td align="right" numeric>
                    {bid.totalSqft > 0 ? bid.totalSqft.toLocaleString() : "—"}
                  </Td>
                  <Td align="right" numeric>
                    {grandTotal != null ? formatCurrency(grandTotal) : "—"}
                  </Td>
                  <Td>
                    <Badge variant={statusVariant[bid.status] ?? "secondary"}>
                      {statusLabels[bid.status] ?? bid.status}
                    </Badge>
                  </Td>
                  <Td muted>
                    {bid.lastProposalAt
                      ? formatShortDate(bid.lastProposalAt)
                      : "—"}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- tiny table cell helpers (local to this file) --- */

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-2.5 font-medium text-xs uppercase tracking-wide ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  muted,
  numeric,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  muted?: boolean;
  numeric?: boolean;
}) {
  return (
    <td
      className={[
        "px-4 py-3 align-middle",
        align === "right" ? "text-right" : "text-left",
        muted ? "text-muted-foreground" : "",
        numeric ? "tabular-nums" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}
