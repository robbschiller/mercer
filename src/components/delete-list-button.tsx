"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { deleteListAction } from "@/lib/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

export function DeleteListButton({ id, name }: { id: string; name: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={deleteListAction}>
      <input type="hidden" name="id" value={id} />
      <DeleteConfirmDialog
        trigger={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-[13px] font-medium text-foreground/70 transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Delete list
          </button>
        }
        title={`Delete “${name}”?`}
        description="The rows go away. Leads you already converted from this list are kept."
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
