import { getLead } from "@/lib/store";
import { NewBidIntake } from "@/components/new-bid-intake";

/**
 * The other front door (intake redesign §8): same property finder as New
 * Lead, but the destination is the quote engine — the building locks, you
 * confirm the deal, and the primary action drafts the quote with AI.
 * Arriving from a lead (?leadId) skips the finder entirely.
 */
export default async function NewBidPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; leadId?: string }>;
}) {
  const { error, leadId } = await searchParams;
  const prefillLead =
    leadId && /^[0-9a-fA-F-]{36}$/.test(leadId) ? await getLead(leadId) : null;

  return (
    <NewBidIntake
      error={error ? decodeURIComponent(error) : null}
      initialLead={
        prefillLead
          ? {
              id: prefillLead.id,
              propertyName:
                prefillLead.propertyName?.trim() || prefillLead.name,
              address: prefillLead.resolvedAddress ?? "",
              clientName: prefillLead.company ?? "",
              latitude: prefillLead.latitude ?? null,
              longitude: prefillLead.longitude ?? null,
              googlePlaceId: prefillLead.googlePlaceId ?? null,
              propertyId: prefillLead.propertyId ?? null,
              isLargeJob: prefillLead.isLargeJob ?? false,
            }
          : null
      }
    />
  );
}
