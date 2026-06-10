import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { uploadPhotoAction, deletePhotoAction } from "@/lib/actions";
import {
  PHOTO_KINDS,
  photoKindLabel,
  type PhotoContextType,
  type PhotoKind,
} from "@/lib/status-meta";
import type { Photo } from "@/lib/store";

/**
 * Polymorphic photo gallery + upload, reused on lead, project, and property
 * pages. Server-rendered; uploads go through `uploadPhotoAction` into the
 * public `photos` bucket.
 */
export function PhotosCard({
  contextType,
  contextId,
  returnTo,
  photos,
  defaultKind = "other",
  description,
}: {
  contextType: PhotoContextType;
  contextId: string;
  returnTo: string;
  photos: Photo[];
  defaultKind?: PhotoKind;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Photos</CardTitle>
        <CardDescription>
          {description ??
            "Photo record for this work — intake, takeoff, progress, completion, damage."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="flex flex-col gap-1">
                <a href={photo.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? photoKindLabel(photo.kind)}
                    loading="lazy"
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                </a>
                <figcaption className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Badge variant="secondary">
                      {photoKindLabel(photo.kind)}
                    </Badge>
                    {photo.caption && (
                      <span className="truncate">{photo.caption}</span>
                    )}
                  </span>
                  <form action={deletePhotoAction}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <SubmitButton
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                    >
                      Remove
                    </SubmitButton>
                  </form>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <form
          action={uploadPhotoAction}
          className="flex flex-wrap items-center gap-2 border-t pt-3"
        >
          <input type="hidden" name="contextType" value={contextType} />
          <input type="hidden" name="contextId" value={contextId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Input
            type="file"
            name="file"
            accept="image/*"
            required
            className="h-8 flex-1 text-xs"
          />
          <select
            name="kind"
            defaultValue={defaultKind}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            {PHOTO_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {photoKindLabel(kind)}
              </option>
            ))}
          </select>
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
