import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import {
  getLead,
  getLatestBidForLead,
  getPhotos,
  getAttachments,
  getContactWithAccount,
  getLeadContactAttempts,
  listAssignableMembers,
} from "@/lib/store";
import { scheduleTakeoffAction } from "@/lib/actions";
import { LeadDetailBody } from "@/components/lead-detail-body";
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

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [lead, linkedBid, photos, attachments, attempts, members] =
    await Promise.all([
      getLead(id),
      getLatestBidForLead(id),
      getPhotos("lead", id),
      getAttachments("lead", id),
      getLeadContactAttempts(id),
      listAssignableMembers(),
    ]);
  if (!lead) notFound();
  const contact = lead.primaryContactId
    ? await getContactWithAccount(lead.primaryContactId)
    : null;

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <BreadcrumbLabel segment={id} label={leadFullName(lead)} />
      <LeadDetailBody
        lead={lead}
        contact={contact}
        members={members}
        attempts={attempts}
        linkedBid={linkedBid}
        error={error}
        closeHref="/leads"
      />
      {lead.status === "takeoff" && (
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
                    ? new Date(lead.takeoffScheduledAt)
                        .toISOString()
                        .slice(0, 16)
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
      )}
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
    </div>
  );
}
