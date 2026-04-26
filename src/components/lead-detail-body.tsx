"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import type { Lead } from "@/lib/store";
import {
  enrichLeadAction,
  logLeadContactAction,
  setLeadFollowUpAction,
  updateLeadAction,
  updateLeadStatusAction,
} from "@/lib/actions";
import { leadFullName } from "@/lib/leads/name";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import {
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

type LinkedBid = { id: string } | null | undefined;

export function LeadDetailBody({
  lead,
  linkedBid,
  error,
  closeHref,
}: {
  lead: Lead;
  linkedBid: LinkedBid;
  error?: string;
  closeHref: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const showRerun =
    !lead.enrichmentStatus ||
    lead.enrichmentStatus === "failed" ||
    lead.enrichmentStatus === "skipped";

  const subtitle = [lead.company, lead.propertyName].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-medium tracking-tight">
            {leadFullName(lead)}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={leadStatusVariant(lead.status)}>
              {leadStatusLabel(lead.status)}
            </Badge>
            {lead.enrichmentStatus && (
              <span className="text-xs text-muted-foreground">
                {enrichmentLabel(lead.enrichmentStatus)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit lead"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link href={closeHref} scroll={false} aria-label="Close details">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {isEditing ? (
        <EditForm lead={lead} onDone={() => setIsEditing(false)} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {lead.email}
                </a>
              ) : (
                <span className="text-muted-foreground/60">No email</span>
              )}
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {lead.phone}
                </a>
              ) : (
                <span className="text-muted-foreground/60">No phone</span>
              )}
              {lead.sourceTag && (
                <span className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  Source: {lead.sourceTag}
                </span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property address</CardTitle>
              <CardDescription className="text-xs">
                Resolved via Google Places from the property and management company.
                This is the property this contact manages.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {lead.resolvedAddress ? (
                <p>{lead.resolvedAddress}</p>
              ) : (
                <p className="text-muted-foreground/60">Not resolved yet</p>
              )}
              {lead.enrichmentError && (
                <p className="text-xs text-destructive">{lead.enrichmentError}</p>
              )}
              {showRerun && (
                <form action={enrichLeadAction} className="pt-2">
                  <input type="hidden" name="id" value={lead.id} />
                  <SubmitButton variant="outline" size="sm">
                    Re-run enrichment
                  </SubmitButton>
                </form>
              )}
            </CardContent>
          </Card>

          <OutreachCard lead={lead} />

          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {lead.notes}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline status</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={updateLeadStatusAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="id" value={lead.id} />
                <select
                  name="status"
                  defaultValue={lead.status}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="new">New</option>
                  <option value="quoted">Quoted</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
                <SubmitButton size="sm">Save status</SubmitButton>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2 pt-2">
            {linkedBid ? (
              <Button variant="outline" asChild>
                <Link href={`/bids/${linkedBid.id}`}>View linked bid</Link>
              </Button>
            ) : null}
            <Button variant="amber" asChild>
              <Link href={`/bids/new?leadId=${lead.id}`}>Create bid from lead</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function EditForm({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  return (
    <form action={updateLeadAction} onSubmit={() => onDone()} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={lead.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Name" htmlFor="lead-name">
            <Input
              id="lead-name"
              name="name"
              defaultValue={lead.name ?? ""}
              required
            />
          </Field>
          <Field label="Email" htmlFor="lead-email">
            <Input
              id="lead-email"
              name="email"
              type="email"
              defaultValue={lead.email ?? ""}
            />
          </Field>
          <Field label="Phone" htmlFor="lead-phone">
            <Input
              id="lead-phone"
              name="phone"
              type="tel"
              defaultValue={lead.phone ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Company" htmlFor="lead-company">
            <Input
              id="lead-company"
              name="company"
              defaultValue={lead.company ?? ""}
            />
          </Field>
          <Field label="Property name" htmlFor="lead-property">
            <Input
              id="lead-property"
              name="propertyName"
              defaultValue={lead.propertyName ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            defaultValue={lead.notes ?? ""}
            rows={4}
            placeholder="Add notes…"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}

function OutreachCard({ lead }: { lead: Lead }) {
  const lastLabel = lead.lastContactedAt
    ? formatRelative(new Date(lead.lastContactedAt))
    : null;
  const attempts = lead.contactAttempts ?? 0;
  const followUp = lead.followUpAt ?? "";
  const isOverdue =
    lead.followUpAt && new Date(lead.followUpAt) < startOfToday();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outreach</CardTitle>
        <CardDescription className="text-xs">
          Track when you last reached out and when to circle back.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-muted-foreground">Last contacted</span>
          <span className="tabular-nums">
            {lastLabel ? (
              <>
                {lastLabel}
                <span className="ms-2 text-xs text-muted-foreground">
                  ({attempts} {attempts === 1 ? "attempt" : "attempts"})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/60">Never</span>
            )}
          </span>
        </div>

        <form action={logLeadContactAction}>
          <input type="hidden" name="id" value={lead.id} />
          <SubmitButton variant="outline" size="sm" className="w-full">
            Log contact attempt
          </SubmitButton>
        </form>

        <form
          action={setLeadFollowUpAction}
          className="flex flex-col gap-2 border-t pt-3"
        >
          <input type="hidden" name="id" value={lead.id} />
          <Label
            htmlFor={`follow-${lead.id}`}
            className="text-xs text-muted-foreground"
          >
            Follow-up date
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`follow-${lead.id}`}
              name="followUpAt"
              type="date"
              defaultValue={followUp}
              className="h-9"
            />
            <SubmitButton size="sm">Save</SubmitButton>
          </div>
          {lead.followUpAt && (
            <p
              className={`text-xs ${
                isOverdue ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {isOverdue ? "Overdue: " : "Due "}
              {formatDate(lead.followUpAt)}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
