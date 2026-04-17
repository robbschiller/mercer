import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getProposalShareBySlug,
  markProposalShareAccessed,
} from "@/lib/store";
import type { ProposalSnapshot } from "@/lib/pdf/types";
import { formatCurrency } from "@/lib/pricing";
import { PublicProposalResponse } from "@/components/public-proposal-response";

function getSnapshot(snapshot: unknown): ProposalSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const value = snapshot as Partial<ProposalSnapshot>;
  if (
    typeof value.propertyName !== "string" ||
    typeof value.address !== "string" ||
    typeof value.clientName !== "string" ||
    typeof value.totalSqft !== "number" ||
    typeof value.grandTotal !== "number"
  ) {
    return null;
  }
  return value as ProposalSnapshot;
}

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await getProposalShareBySlug(slug);
  if (!record) notFound();

  await markProposalShareAccessed(slug);
  const snapshot = getSnapshot(record.proposal.snapshot);
  if (!snapshot) notFound();

  const isAccepted = Boolean(record.share.acceptedAt);
  const isDeclined = Boolean(record.share.declinedAt);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Mercer Proposal
          </p>
          <h1 className="text-2xl font-semibold">{snapshot.propertyName}</h1>
          <p className="text-sm text-muted-foreground">{snapshot.address}</p>
        </div>
        <Badge variant="secondary">{record.bid.status.toUpperCase()}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scope & pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium">{snapshot.clientName}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total area</p>
              <p className="text-sm font-medium">
                {snapshot.totalSqft.toLocaleString()} sqft
              </p>
            </div>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Bid total</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(snapshot.grandTotal)}
            </p>
          </div>
          {snapshot.notes && (
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{snapshot.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Respond</CardTitle>
        </CardHeader>
        <CardContent>
          <PublicProposalResponse
            slug={slug}
            isAccepted={isAccepted}
            isDeclined={isDeclined}
            acceptedByName={record.share.acceptedByName}
            acceptedByTitle={record.share.acceptedByTitle}
            declineReason={record.share.declineReason}
          />
        </CardContent>
      </Card>
    </main>
  );
}
