import Link from "next/link";
import { getTakeoffQueue, type TakeoffQueueRow } from "@/lib/store";
import { scheduleTakeoffAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function ageInDays(createdAt: Date): number {
  return Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 86_400_000),
  );
}

export default async function TakeoffQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const queue = await getTakeoffQueue();
  const needsTakeoff = queue.filter((l) => l.status === "needs_takeoff");
  const scheduled = queue.filter((l) => l.status === "takeoff_scheduled");

  return (
    <div className="flex flex-col gap-4 p-3 lg:p-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">The takeoff queue is clear.</p>
            <p className="max-w-sm text-sm text-muted-foreground/80">
              New leads land here until their takeoff is scheduled and a quote
              goes out.
            </p>
            <Button variant="outline" asChild>
              <Link href="/leads/new">Add a lead</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <QueueSection
            title={`Needs takeoff (${needsTakeoff.length})`}
            leads={needsTakeoff}
            emptyText="Nothing waiting — every open lead has a takeoff booked."
          />
          <QueueSection
            title={`Takeoff scheduled (${scheduled.length})`}
            leads={scheduled}
            emptyText="No takeoffs booked yet."
          />
        </>
      )}
    </div>
  );
}

function QueueSection({
  title,
  leads,
  emptyText,
}: {
  title: string;
  leads: TakeoffQueueRow[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Lead</th>
                  <th className="py-2 pr-4 font-medium">Property</th>
                  <th className="py-2 pr-4 font-medium">Account</th>
                  <th className="py-2 pr-4 font-medium">Size</th>
                  <th className="py-2 pr-4 font-medium">Est. value</th>
                  <th className="py-2 pr-4 font-medium">Waiting</th>
                  <th className="py-2 font-medium">Takeoff</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <QueueRow key={lead.id} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QueueRow({ lead }: { lead: TakeoffQueueRow }) {
  const scheduledFor = lead.takeoffScheduledAt
    ? new Date(lead.takeoffScheduledAt).toLocaleDateString()
    : null;
  return (
    <tr className="border-b last:border-0 align-middle">
      <td className="py-2 pr-4">
        <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
          {lead.name}
        </Link>
        {lead.scopeCategory && lead.scopeCategory.length > 0 && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {lead.scopeCategory.join(", ")}
          </div>
        )}
      </td>
      <td className="py-2 pr-4 text-muted-foreground">
        {lead.propertyDisplayName ?? lead.propertyAddress ?? lead.propertyName ?? "—"}
      </td>
      <td className="py-2 pr-4 text-muted-foreground">
        {lead.accountName ?? lead.company ?? "—"}
      </td>
      <td className="py-2 pr-4">
        <Badge variant={lead.isLargeJob ? "default" : "secondary"}>
          {lead.isLargeJob ? "Large" : "Small"}
        </Badge>
      </td>
      <td className="py-2 pr-4 text-muted-foreground">
        {lead.estValue ? money.format(Number(lead.estValue)) : "—"}
      </td>
      <td className="py-2 pr-4 text-muted-foreground">
        {scheduledFor ?? `${ageInDays(new Date(lead.createdAt))}d`}
      </td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <form action={scheduleTakeoffAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={lead.id} />
            <input
              type="date"
              name="scheduledAt"
              required
              defaultValue={
                lead.takeoffScheduledAt
                  ? new Date(lead.takeoffScheduledAt)
                      .toISOString()
                      .slice(0, 10)
                  : undefined
              }
              className="h-8 rounded-md border bg-background px-2 text-xs"
            />
            <SubmitButton size="sm" variant="outline">
              {scheduledFor ? "Rebook" : "Schedule"}
            </SubmitButton>
          </form>
          <Button size="sm" variant="amber" asChild>
            <Link
              href={
                lead.isLargeJob
                  ? `/bids/new?leadId=${lead.id}`
                  : `/bids/new/small?leadId=${lead.id}`
              }
            >
              {lead.isLargeJob ? "Start bid" : "Quick takeoff"}
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}
