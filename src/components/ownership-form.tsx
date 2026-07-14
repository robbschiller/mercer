"use client";

import { useState } from "react";
import { setPropertyOwnerContactAction } from "@/lib/actions";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  OWNERSHIP_TYPES,
  ownershipTypeLabel,
  type OwnershipType,
} from "@/lib/status-meta";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * Owner block of the Ownership card. HOA/condo properties have no individual
 * owner (Jordan fix-list #4), so the contact picker only applies to
 * individual ownership.
 */
export function OwnershipForm({
  propertyId,
  contacts,
  ownerContactId,
  ownershipType,
}: {
  propertyId: string;
  contacts: { id: string; name: string }[];
  ownerContactId: string | null;
  ownershipType: OwnershipType;
}) {
  const [type, setType] = useState<OwnershipType>(ownershipType);

  return (
    <form
      action={setPropertyOwnerContactAction}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ownershipType">Ownership type</Label>
        <select
          id="ownershipType"
          name="ownershipType"
          value={type}
          onChange={(e) => setType(e.target.value as OwnershipType)}
          className={selectClass}
        >
          {OWNERSHIP_TYPES.map((t) => (
            <option key={t} value={t}>
              {ownershipTypeLabel(t)}
            </option>
          ))}
        </select>
      </div>
      {type === "hoa" ? (
        <p className="text-xs text-muted-foreground">
          The association itself owns the property — no individual owner
          contact needed. Board or association contacts still live in the
          contacts list above.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactId">Owner contact</Label>
          <select
            id="contactId"
            name="contactId"
            defaultValue={ownerContactId ?? ""}
            className={selectClass}
            disabled={contacts.length === 0}
          >
            <option value="">— None —</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          {contacts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Add a contact to this property first.
            </p>
          ) : null}
        </div>
      )}
      <SubmitButton size="sm" className="self-start">
        Save owner
      </SubmitButton>
    </form>
  );
}
