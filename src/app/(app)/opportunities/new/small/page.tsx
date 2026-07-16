import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead, getPriceListItems, type PriceListItem } from "@/lib/store";
import { createSmallTakeoffAction } from "@/lib/actions/create-bid";
import { leadFullName } from "@/lib/leads/name";
import {
  priceListCategoryLabel,
  pricingUnitLabel,
} from "@/lib/status-meta";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function groupByCategory(
  items: PriceListItem[],
): Array<[string, PriceListItem[]]> {
  const groups = new Map<string, PriceListItem[]>();
  for (const item of items) {
    const key = item.category ?? "other";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

export default async function SmallTakeoffPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; error?: string }>;
}) {
  const { leadId, error } = await searchParams;
  if (!leadId) notFound();
  const [lead, items] = await Promise.all([
    getLead(leadId),
    getPriceListItems({ activeOnly: true }),
  ]);
  if (!lead) notFound();

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Small-job takeoff
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          {lead.propertyName ?? leadFullName(lead)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[lead.company, lead.resolvedAddress].filter(Boolean).join(" · ") ||
            "Pick quantities off the price list — no buildings or surfaces."}
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">
              Your service catalog is empty.
            </p>
            <p className="max-w-sm text-sm text-muted-foreground/80">
              The small-job takeoff prices straight off the catalog. Add SKUs
              first, or use the full opportunity wizard.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/settings/catalog">Open catalog settings</Link>
              </Button>
              <Button asChild>
                <Link href={`/opportunities/new?leadId=${lead.id}`}>
                  Full opportunity wizard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form action={createSmallTakeoffAction} className="flex flex-col gap-4">
          <input type="hidden" name="leadId" value={lead.id} />
          {groupByCategory(items).map(([category, group]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">
                  {priceListCategoryLabel(category)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Service</th>
                      <th className="py-2 pr-4 font-medium">Rate</th>
                      <th className="py-2 font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span className="font-medium">{item.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.sku}
                          </span>
                          {item.shortDescription && (
                            <p className="text-xs text-muted-foreground">
                              {item.shortDescription}
                            </p>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {item.chargePerUnit != null
                            ? `${money.format(Number(item.chargePerUnit))}${
                                item.pricingUnit
                                  ? ` ${pricingUnitLabel(item.pricingUnit)}`
                                  : ""
                              }`
                            : "—"}
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            name={`qty_${item.id}`}
                            min={0}
                            step="any"
                            placeholder="0"
                            className="h-8 w-24"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create the opportunity</CardTitle>
              <CardDescription>
                Items with a quantity become priced line items on a new opportunity for
                this lead; the lead moves to “Quote sent”. You can still add or
                adjust lines on the opportunity afterward.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <SubmitButton variant="amber">Create priced opportunity</SubmitButton>
              <Button variant="ghost" asChild>
                <Link href={`/opportunities/new?leadId=${lead.id}`}>
                  Use the full wizard instead
                </Link>
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
