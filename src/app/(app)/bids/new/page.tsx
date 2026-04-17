import Link from "next/link";
import { NewBidWizard } from "@/components/new-bid-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getLead } from "@/lib/store";

export default async function NewBidPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; leadId?: string }>;
}) {
  const { error: errorParam, leadId } = await searchParams;
  const errorMessage = errorParam
    ? decodeURIComponent(errorParam)
    : null;
  const prefillLead =
    leadId && /^[0-9a-fA-F-]{36}$/.test(leadId)
      ? await getLead(leadId)
      : null;

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>New bid</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bids">Back to bids</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <NewBidWizard
            errorMessage={errorMessage}
            initialLead={
              prefillLead
                ? {
                    id: prefillLead.id,
                    propertyName: prefillLead.propertyName ?? "",
                    address: prefillLead.resolvedAddress ?? "",
                    clientName:
                      prefillLead.company ?? prefillLead.name ?? "",
                    notes: prefillLead.notes ?? "",
                    latitude: prefillLead.latitude ?? null,
                    longitude: prefillLead.longitude ?? null,
                    googlePlaceId: prefillLead.googlePlaceId ?? null,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
