import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import {
  getLead,
  getLatestBidForLead,
  getPhotos,
  getAttachments,
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

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [lead, linkedBid, photos, attachments] = await Promise.all([
    getLead(id),
    getLatestBidForLead(id),
    getPhotos("lead", id),
    getAttachments("lead", id),
  ]);
  if (!lead) notFound();

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <BreadcrumbLabel segment={id} label={leadFullName(lead)} />
      <LeadDetailBody
        lead={lead}
        linkedBid={linkedBid}
        error={error}
        closeHref="/leads"
      />
      {(lead.status === "needs_takeoff" ||
        lead.status === "takeoff_scheduled") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" />
              {lead.status === "takeoff_scheduled"
                ? "Takeoff scheduled"
                : "Schedule the takeoff"}
            </CardTitle>
            <CardDescription>
              {lead.status === "takeoff_scheduled" && lead.takeoffScheduledAt
                ? `On the books for ${new Date(lead.takeoffScheduledAt).toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — reschedule below if it moves.`
                : "Put the site walk on the calendar — the lead moves to the takeoff stage."}
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
                {lead.status === "takeoff_scheduled"
                  ? "Reschedule"
                  : "Schedule takeoff"}
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
