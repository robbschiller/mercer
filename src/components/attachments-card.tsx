import { FileText } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { uploadAttachmentAction, deleteAttachmentAction } from "@/lib/actions";
import type { PhotoContextType } from "@/lib/status-meta";
import type { Attachment } from "@/lib/store";

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Polymorphic document list + upload (paint specs, RFPs, referral emails),
 * the non-image sibling of PhotosCard. Jordan fix-list #1.
 */
export function AttachmentsCard({
  contextType,
  contextId,
  returnTo,
  attachments,
  description,
}: {
  contextType: PhotoContextType;
  contextId: string;
  returnTo: string;
  attachments: Attachment[];
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Files</CardTitle>
        <CardDescription>
          {description ??
            "Paint specs, RFPs, referral emails — documents attached to this record."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {attachments.length > 0 && (
          <ul className="flex flex-col gap-2">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.fileName}</span>
                </a>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {fmtSize(file.sizeBytes)}
                  <form action={deleteAttachmentAction}>
                    <input type="hidden" name="id" value={file.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <SubmitButton
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                    >
                      Remove
                    </SubmitButton>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form
          action={uploadAttachmentAction}
          className="flex flex-wrap items-center gap-2 border-t pt-3"
        >
          <input type="hidden" name="contextType" value={contextType} />
          <input type="hidden" name="contextId" value={contextId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Input
            type="file"
            name="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.eml,.msg,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*,application/pdf"
            required
            className="h-8 flex-1 text-xs"
          />
          <Input
            name="caption"
            placeholder="Caption (optional)"
            className="h-8 w-44 text-xs"
          />
          <SubmitButton variant="outline" size="sm">
            Upload
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
