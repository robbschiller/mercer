import {
  getContactsRegister,
  getLeadSourceTags,
  getLeadWorkTypes,
  getListRow,
} from "@/lib/store";
import { listRowToDraft } from "@/lib/leads/list-row-draft";
import { NewLeadIntake } from "@/components/new-lead-intake";

/**
 * The front door (intake redesign §7): finding the building feels like
 * Google Maps — type, see the building, done. Known buildings attach the
 * existing property record; everything else is three quick bands.
 */
export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; listRow?: string }>;
}) {
  const { error, listRow } = await searchParams;
  const [{ rows: contacts }, sources, workTypes, row] = await Promise.all([
    getContactsRegister({ limit: 50 }),
    getLeadSourceTags(),
    getLeadWorkTypes(),
    listRow ? getListRow(listRow) : Promise.resolve(null),
  ]);
  // Convert (1b): a list row pre-fills the form; nothing is written until
  // the person hits "Add lead".
  const prefill = row && !row.convertedLeadId ? listRowToDraft(row) : null;

  return (
    <NewLeadIntake
      contacts={contacts}
      sources={sources}
      workTypes={workTypes}
      error={error ?? null}
      prefill={prefill}
      listRowId={prefill ? row!.id : null}
      listName={prefill ? row!.list.name : null}
    />
  );
}
