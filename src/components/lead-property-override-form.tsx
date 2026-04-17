"use client";

import Link from "next/link";
import { overrideLeadPropertyAction } from "@/lib/actions";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

/**
 * Manual address/lat/lng override for a lead whose Places enrichment landed on
 * the wrong building. Reuses AddressAutocomplete — it emits hidden `address /
 * latitude / longitude / googlePlaceId` fields that match the server action's
 * schema. On save the action rebuilds the satellite proxy path and redirects
 * back to the lead detail without the ?edit=property flag.
 */
export function LeadPropertyOverrideForm({
  leadId,
  initialAddress,
  initialLat,
  initialLng,
  initialPlaceId,
}: {
  leadId: string;
  initialAddress: string;
  initialLat: number | null;
  initialLng: number | null;
  initialPlaceId: string | null;
}) {
  return (
    <form action={overrideLeadPropertyAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={leadId} />
      <AddressAutocomplete
        id={`lead-${leadId}-address`}
        initialAddress={initialAddress}
        initialLat={initialLat}
        initialLng={initialLng}
        initialPlaceId={initialPlaceId}
        required
      />
      <p className="text-xs text-muted-foreground">
        Start typing to search Google Places, or paste an address. Picking a
        suggestion captures lat/lng so the satellite preview re-renders at the
        new location.
      </p>
      <div className="flex items-center gap-2">
        <SubmitButton size="sm">Save address</SubmitButton>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/leads/${leadId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
