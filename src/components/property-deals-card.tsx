import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PropertyDeal } from "@/lib/store";
import {
  bidStatusLabel,
  leadStatusLabel,
  projectStatusLabel,
} from "@/lib/status-meta";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const KIND_LABELS: Record<PropertyDeal["kind"], string> = {
  lead: "Lead",
  bid: "Bid",
  job: "Job",
};

function statusLabel(deal: PropertyDeal): string {
  if (deal.kind === "job") return projectStatusLabel(deal.status);
  if (deal.kind === "bid") return bidStatusLabel(deal.status);
  return leadStatusLabel(deal.status);
}

/**
 * The repeat-business view: every deal that ever touched this property.
 * Owners rotate, deals close — the property keeps the history.
 */
export function PropertyDealsCard({ deals }: { deals: PropertyDeal[] }) {
  const jobs = deals.filter((d) => d.kind === "job");
  const openBids = deals.filter((d) => d.kind === "bid" && d.status !== "lost");
  const wonValue = jobs.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deals at this property</CardTitle>
        <CardDescription>
          {deals.length === 0
            ? "Nothing yet — this property's full history will build here."
            : [
                `${jobs.length} job${jobs.length === 1 ? "" : "s"}`,
                `${openBids.length} open bid${openBids.length === 1 ? "" : "s"}`,
                wonValue > 0 ? `${money.format(wonValue)} won` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </CardDescription>
      </CardHeader>
      {deals.length > 0 && (
        <CardContent>
          <ul className="flex flex-col">
            {deals.map((deal) => (
              <li
                key={`${deal.kind}-${deal.id}`}
                className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Badge
                    variant={deal.kind === "job" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {KIND_LABELS[deal.kind]}
                  </Badge>
                  <Link href={deal.href} className="truncate hover:underline">
                    {deal.name}
                  </Link>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  {deal.value != null && (
                    <span className="tabular-nums">
                      {money.format(deal.value)}
                    </span>
                  )}
                  <span>{statusLabel(deal)}</span>
                  <span>{deal.createdAt.toLocaleDateString()}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
