"use client";

import { useState } from "react";
import { Pencil, PhoneCall } from "lucide-react";
import { logListRowContactAction } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

/**
 * Last-contact cell on a list table. Reads at a glance, logs a touch in one
 * click, and lets a wrong date be corrected without leaving the row.
 */
export function ListRowContactCell({
  rowId,
  lastContactedAt,
  attempts,
}: {
  rowId: string;
  /** ISO string — Dates don't cross the server/client boundary. */
  lastContactedAt: string | null;
  attempts: number;
}) {
  const [editing, setEditing] = useState(false);
  const last = lastContactedAt ? new Date(lastContactedAt) : null;

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await logListRowContactAction(fd);
          setEditing(false);
        }}
        className="flex items-center gap-1.5"
      >
        <input type="hidden" name="id" value={rowId} />
        <input type="hidden" name="mode" value="set" />
        <input
          type="date"
          name="contactedAt"
          required
          autoFocus
          defaultValue={last ? toDateInput(last) : toDateInput(new Date())}
          max={toDateInput(new Date())}
          className="h-8 rounded-lg border bg-background px-2 text-xs"
        />
        <SubmitButton size="sm" variant="outline" className="h-8 px-2.5 text-xs">
          Save
        </SubmitButton>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-8 px-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={last ? "Change the last-contact date" : "Set a last-contact date"}
        className={cn(
          "group/date inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs tabular-nums transition-colors hover:bg-muted",
          last ? "text-foreground/90" : "text-muted-foreground/60",
        )}
      >
        {last ? (
          <>
            <span>{fmtShort(last)}</span>
            {attempts > 1 && (
              <span className="text-muted-foreground">×{attempts}</span>
            )}
          </>
        ) : (
          "Never"
        )}
        <Pencil className="size-3 opacity-0 transition-opacity group-hover/date:opacity-60" />
      </button>
      <form action={logListRowContactAction}>
        <input type="hidden" name="id" value={rowId} />
        <input type="hidden" name="mode" value="log" />
        <SubmitButton
          size="sm"
          variant="outline"
          title="Log a contact attempt now"
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          <PhoneCall className="size-3.5" />
          Log contact
        </SubmitButton>
      </form>
    </div>
  );
}

function fmtShort(d: Date): string {
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function toDateInput(d: Date): string {
  return d.toLocaleDateString("en-CA");
}
