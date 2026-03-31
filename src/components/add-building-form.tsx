"use client";

import { useRef } from "react";
import { createBuildingAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

export function AddBuildingForm({ bidId }: { bidId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    await createBuildingAction(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleAction} className="flex flex-col sm:flex-row sm:items-end gap-3">
      <input type="hidden" name="bidId" value={bidId} />
      <div className="flex flex-col gap-1.5 flex-1">
        <Label htmlFor="building-label" className="text-xs">
          Building label
        </Label>
        <Input
          id="building-label"
          name="label"
          placeholder='e.g. "Six unit 3-story"'
          required
        />
      </div>
      <div className="flex items-end gap-3 sm:contents">
        <div className="flex flex-col gap-1.5 w-20 shrink-0">
          <Label htmlFor="building-count" className="text-xs">
            Count
          </Label>
          <Input
            id="building-count"
            name="count"
            type="number"
            min={1}
            defaultValue={1}
            required
          />
        </div>
        <SubmitButton size="sm" className="flex-1 sm:flex-none">Add</SubmitButton>
      </div>
    </form>
  );
}
