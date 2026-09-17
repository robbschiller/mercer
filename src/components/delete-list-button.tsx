"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { deleteListAction } from "@/lib/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";

export function DeleteListButton({ id, name }: { id: string; name: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={deleteListAction}>
      <input type="hidden" name="id" value={id} />
      <DeleteConfirmDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            className="text-foreground/70 hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete list
          </Button>
        }
        title={`Delete “${name}”?`}
        description="The rows go away. Leads you already converted from this list are kept."
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
