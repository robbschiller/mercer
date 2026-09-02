import { notFound } from "next/navigation";
import { CalendarClock, Route } from "lucide-react";
import {
  getLead,
  getLatestBidForLead,
  getPhotos,
  getAttachments,
  getContactWithAccount,
  getLeadContactAttempts,
  getPropertyDetail,
  getPropertyRelationshipHistory,
  getPropertyDeals,
  listAssignableMembers,
  getLeadWorkTypes,
  getLeadSourceTags,
} from "@/lib/store";
import { scheduleTakeoffAction } from "@/lib/actions";
import { LeadDetailBody } from "@/components/lead-detail-body";
import { PropertyProfile, Panel } from "@/components/property-profile";
import { PhotosCard } from "@/components/photos-card";
import { AttachmentsCard } from "@/components/attachments-card";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { leadFullName } from "@/lib/leads/name";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

// The browser tab reads the project name, same as the page title (C3).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  return { title: lead ? leadFullName(lead) : "Lead" };
}

/**
 * Lead detail — keyed on the lead, dressed in its building.
 *
 * A lead is a contact plus a property, so the page shows both: the lead's own
 * workflow (status, follow-up, takeoff, convert) sitting inside the property's
 * full profile — aerial, ledger, timeline, specs, contacts. A property outlives
 * its leads (repaint cycles), which is why the URL stays `/leads/[id]` and two
 * leads on one building each keep their own page.
 */
export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const lead = await getLead(id);
  if (!lead) notFound();

  const [
    linkedBid,
    photos,
    attachments,
    attempts,
    members,
    workTypes,
    sources,
    contact,
  ] =
    await Promise.all([
      getLatestBidForLead(id),
      getPhotos("lead", id),
      getAttachments("lead", id),
      getLeadContactAttempts(id),
      listAssignableMembers(),
      getLeadWorkTypes(),
      getLeadSourceTags(),
      lead.primaryContactId
        ? getContactWithAccount(lead.primaryContactId)
        : Promise.resolve(null),
    ]);

  // The building's story, when this lead is rooted in one. Leads created
  // before the property finder (or from a bare name) have no property — those
  // fall back to the plain lead column below.
  const [propertyDetail, history, propertyPhotos, deals] = lead.propertyId
    ? await Promise.all([
        getPropertyDetail(lead.propertyId),
        getPropertyRelationshipHistory(lead.propertyId),
        getPhotos("property", lead.propertyId),
        getPropertyDeals(lead.propertyId),
      ])
    : [null, null, null, null];

  const title = leadFullName(lead);
  const workflow = (
    <div className="mb-4 flex flex-col gap-4">
      <Panel
        icon={<Route className="size-[15px]" />}
        title="This lead"
        note="status, follow-up and what happens next"
      >
        <div className="p-4">
          <LeadDetailBody
            lead={lead}
            contact={contact}
            members={members}
            attempts={attempts}
            linkedBid={linkedBid}
            error={error}
            closeHref="/leads"
            workTypes={workTypes}
            sources={sources}
            hideIdentity
          />
        </div>
      </Panel>
      {lead.status === "takeoff" && <TakeoffCard lead={lead} />}
    </div>
  );

  const leadFiles = (
    <>
      <AttachmentsCard
        contextType="lead"
        contextId={id}
        returnTo={`/leads/${id}`}
        attachments={attachments}
        description="Paint specs, RFPs, referral emails — everything that arrived with this opportunity."
      />
      <PhotosCard
        contextType="lead"
        contextId={id}
        returnTo={`/leads/${id}`}
        photos={photos}
        defaultKind="intake"
        description="Intake and walk-through shots — what the takeoff crew should see before arriving."
      />
    </>
  );

  if (!propertyDetail || !history || !propertyPhotos || !deals) {
    return (
      <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        <BreadcrumbLabel segment={id} label={title} />
        <LeadDetailBody
          lead={lead}
          contact={contact}
          members={members}
          attempts={attempts}
          linkedBid={linkedBid}
          error={error}
          closeHref="/leads"
            workTypes={workTypes}
            sources={sources}
        />
        {lead.status === "takeoff" && <TakeoffCard lead={lead} />}
        {leadFiles}
      </div>
    );
  }

  const buildingLabel =
    propertyDetail.property.name ??
    lead.propertyName ??
    propertyDetail.property.address ??
    null;

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <BreadcrumbLabel segment={id} label={title} />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <PropertyProfile
        detail={propertyDetail}
        history={history}
        photos={propertyPhotos}
        deals={deals}
        title={title}
        subtitle={buildingLabel}
        backHref="/leads"
        backLabel="Leads"
        returnTo={`/leads/${id}`}
        headerSlot={workflow}
        belowTimelineSlot={leadFiles}
        compact
      />
    </div>
  );
}

function TakeoffCard({
  lead,
}: {
  lead: { id: string; takeoffScheduledAt: Date | null };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4" />
          {lead.takeoffScheduledAt
            ? "Takeoff scheduled"
            : "Schedule the takeoff"}
        </CardTitle>
        <CardDescription>
          {lead.takeoffScheduledAt
            ? `On the books for ${new Date(lead.takeoffScheduledAt).toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — reschedule below if it moves.`
            : "Put the site walk on the calendar — whether it's booked shows right on the pipeline row."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={scheduleTakeoffAction}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={lead.id} />
          <Input
            type="datetime-local"
            name="scheduledAt"
            required
            defaultValue={
              lead.takeoffScheduledAt
                ? new Date(lead.takeoffScheduledAt).toISOString().slice(0, 16)
                : ""
            }
            className="h-9 w-56"
          />
          <SubmitButton size="sm">
            {lead.takeoffScheduledAt ? "Reschedule" : "Schedule takeoff"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
