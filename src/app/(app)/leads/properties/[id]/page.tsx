import { notFound } from "next/navigation";
import {
  getPropertyDetail,
  getPropertyRelationshipHistory,
  getPhotos,
  type RelationshipRow,
} from "@/lib/store";
import { PhotosCard } from "@/components/photos-card";
import {
  startPropertyRelationshipAction,
  endPropertyRelationshipAction,
  updatePropertySpecsAction,
  uploadPhotoAction,
} from "@/lib/actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PropertyDetailPanel } from "@/components/property-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

function fmtRange(r: RelationshipRow): string {
  const start = r.startDate;
  return r.endDate ? `${start} – ${r.endDate}` : `${start} – present`;
}

function RelationshipList({
  title,
  kind,
  propertyId,
  rows,
}: {
  title: string;
  kind: "management" | "owner";
  propertyId: string;
  rows: RelationshipRow[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span>{r.accountName}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {fmtRange(r)}
                  {r.current && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[0.6875rem] font-medium text-foreground">
                      current
                    </span>
                  )}
                </span>
              </div>
              {r.current && (
                <form
                  action={endPropertyRelationshipAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="propertyId" value={propertyId} />
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="id" value={r.id} />
                  <Input
                    type="date"
                    name="endDate"
                    required
                    className="h-7 w-36 text-xs"
                  />
                  <SubmitButton variant="outline" size="sm">
                    End
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        action={startPropertyRelationshipAction}
        className="mt-1 flex flex-wrap items-center gap-2 border-t pt-2"
      >
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="kind" value={kind} />
        <Input
          name="accountName"
          required
          placeholder={kind === "owner" ? "New owner" : "New management co."}
          className="h-7 flex-1 text-xs"
        />
        <Input type="date" name="startDate" required className="h-7 w-36 text-xs" />
        <SubmitButton variant="outline" size="sm">
          Add
        </SubmitButton>
      </form>
    </div>
  );
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [detail, history, photos] = await Promise.all([
    getPropertyDetail(id),
    getPropertyRelationshipHistory(id),
    getPhotos("property", id),
  ]);
  if (!detail) notFound();

  const specPhotos = photos.filter((p) => p.kind === "specs");
  const label =
    detail.property.name ?? detail.property.address ?? "Untitled property";

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <BreadcrumbLabel segment={id} label={label} />
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <PropertyDetailPanel
        detail={detail}
        closeHref="/leads"
        buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
        buildContactHref={(contactId) => `/contacts/${contactId}`}
        buildLeadHref={(leadId) => `/leads/${leadId}`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property specs</CardTitle>
          <CardDescription>
            What the property could be sold on, and what crews should know
            before arriving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={updatePropertySpecsAction}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="propertyId" value={id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="spec-sqft-nonfloor">
                  Paintable sq ft — non-floor surfaces
                </Label>
                <Input
                  id="spec-sqft-nonfloor"
                  name="attainableSqftNonfloor"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={detail.property.attainableSqftNonfloor ?? ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="spec-sqft-floors">
                  Paintable sq ft — floors
                </Label>
                <Input
                  id="spec-sqft-floors"
                  name="attainableSqftFloors"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={detail.property.attainableSqftFloors ?? ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="spec-breezeways">Breezeways</Label>
                <Input
                  id="spec-breezeways"
                  name="breezewayCount"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={detail.property.breezewayCount ?? ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="spec-stairs">Stair systems</Label>
                <Input
                  id="spec-stairs"
                  name="stairSystemCount"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={detail.property.stairSystemCount ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spec-maintenance">
                Maintenance history / known issues
              </Label>
              <Textarea
                id="spec-maintenance"
                name="maintenanceNotes"
                placeholder="Things crews should know before arriving — recurring leaks, fragile landscaping, gate codes handled by the office…"
                defaultValue={detail.property.maintenanceNotes}
                className="min-h-20"
              />
            </div>
            <div>
              <SubmitButton size="sm">Save specs</SubmitButton>
            </div>
          </form>

          <div className="mt-5 flex flex-col gap-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Spec photos</p>
              <p className="text-xs text-muted-foreground">
                Site conditions behind these numbers — breezeway and
                stair-system shots live with the specs.
              </p>
            </div>
            {specPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {specPhotos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? "Spec photo"}
                      loading="lazy"
                      className="aspect-square w-full rounded-md border object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
            <form
              action={uploadPhotoAction}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="contextType" value="property" />
              <input type="hidden" name="contextId" value={id} />
              <input type="hidden" name="kind" value="specs" />
              <input
                type="hidden"
                name="returnTo"
                value={`/leads/properties/${id}`}
              />
              <Input
                type="file"
                name="file"
                accept="image/*"
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
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relationship history</CardTitle>
          <CardDescription>
            Owners sell and management companies rotate — the property is the
            durable thing. Every relationship is dated. Adding a current one
            ends the previous as of the new start date.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <RelationshipList
            title="Management companies"
            kind="management"
            propertyId={id}
            rows={history.management}
          />
          <RelationshipList
            title="Owners"
            kind="owner"
            propertyId={id}
            rows={history.owner}
          />
        </CardContent>
      </Card>
      <PhotosCard
        contextType="property"
        contextId={id}
        returnTo={`/leads/properties/${id}`}
        photos={photos}
        description="The property's standing photo record, independent of any one job."
      />
    </div>
  );
}
