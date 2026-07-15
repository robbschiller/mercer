import { getContactsRegister, getLeadSourceTags } from "@/lib/store";
import { NewLeadIntake } from "@/components/new-lead-intake";

/**
 * The front door (intake redesign §7): finding the building feels like
 * Google Maps — type, see the building, done. Known buildings attach the
 * existing property record; everything else is three quick bands.
 */
export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [{ rows: contacts }, sources] = await Promise.all([
    getContactsRegister({ limit: 50 }),
    getLeadSourceTags(),
  ]);

  return (
    <NewLeadIntake
      contacts={contacts}
      sources={sources}
      error={error ?? null}
    />
  );
}
