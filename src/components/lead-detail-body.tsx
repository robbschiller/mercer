"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, Pencil, UserRound, X } from "lucide-react";
import type {
  AssignableMember,
  ContactAttempt,
  Lead,
  LeadContactCard,
} from "@/lib/store";
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
  LEAD_STATUSES,
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

type LinkedBid = { id: string } | null | undefined;

/** "Robert Strembicki" → ["Robert", "Strembicki"]; single words stay first. */
function splitName(name: string): [string, string] {
  const trimmed = name.trim();
  const i = trimmed.lastIndexOf(" ");
  if (i < 0) return [trimmed, ""];
  return [trimmed.slice(0, i), trimmed.slice(i + 1)];
}

export function LeadDetailBody({
  lead,
  contact,
  members,
  attempts,
  linkedBid,
  error,
  closeHref,
}: {
  lead: Lead;
  contact: LeadContactCard | null;
  members: AssignableMember[];
  attempts: ContactAttempt[];
  linkedBid: LinkedBid;
  error?: string;
  closeHref: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const showRerun =
    !lead.enrichmentStatus ||
    lead.enrichmentStatus === "failed" ||
    lead.enrichmentStatus === "skipped";

  const company = contact?.accountName ?? lead.company;
  const subtitle = [company, lead.propertyName].filter(Boolean).join(" · ");

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
        <EditForm
          lead={lead}
          contact={contact}
          onDone={() => setIsEditing(false)}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {contact ? (
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <UserRound className="size-4 text-muted-foreground" />
                    {contact.name}
                  </Link>
                  {(contact.accountName ?? lead.company) && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="size-4" />
                      {contact.accountId ? (
                        <Link
                          href={`/leads/accounts/${contact.accountId}`}
                          className="hover:underline"
                        >
                          {contact.accountName}
                        </Link>
                      ) : (
                        (contact.accountName ?? lead.company)
                      )}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground/60">
                  No contact on this lead yet — add one in Edit.
                </span>
              )}
              {(contact?.email ?? lead.email) ? (
                <a
                  href={`mailto:${contact?.email ?? lead.email}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {contact?.email ?? lead.email}
                </a>
              ) : (
                <span className="text-muted-foreground/60">No email</span>
              )}
              {(contact?.phone ?? lead.phone) ? (
                <a
                  href={`tel:${contact?.phone ?? lead.phone}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {contact?.phone ?? lead.phone}
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

          <OutreachCard
            lead={lead}
            contactName={contact?.name ?? null}
            members={members}
            attempts={attempts}
          />

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
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {leadStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <SubmitButton size="sm">Save status</SubmitButton>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2 pt-2">
            {linkedBid ? (
              <Button variant="outline" asChild>
                <Link href={`/opportunities/${linkedBid.id}`}>View linked opportunity</Link>
              </Button>
            ) : null}
            <Button variant="amber" asChild>
              <Link href={`/opportunities/new?leadId=${lead.id}`}>Convert to opportunity</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Edit form, restructured (Jordan C5): Project / Contact / Property /
 * Company sections, each saving to its own record — the project name never
 * lands in the contact's Name field again.
 */
function EditForm({
  lead,
  contact,
  onDone,
}: {
  lead: Lead;
  contact: LeadContactCard | null;
  onDone: () => void;
}) {
  const [first, last] = splitName(contact?.name ?? "");
  return (
    <form action={updateLeadAction} onSubmit={() => onDone()} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={lead.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Project name" htmlFor="lead-name">
            <Input
              id="lead-name"
              name="name"
              defaultValue={lead.name ?? ""}
              required
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="lead-contact-first">
              <Input
                id="lead-contact-first"
                name="contactFirstName"
                defaultValue={first}
              />
            </Field>
            <Field label="Last name" htmlFor="lead-contact-last">
              <Input
                id="lead-contact-last"
                name="contactLastName"
                defaultValue={last}
              />
            </Field>
          </div>
          <Field label="Email" htmlFor="lead-email">
            <Input
              id="lead-email"
              name="email"
              type="email"
              defaultValue={contact?.email ?? lead.email ?? ""}
            />
          </Field>
          <Field label="Phone" htmlFor="lead-phone">
            <Input
              id="lead-phone"
              name="phone"
              type="tel"
              defaultValue={contact?.phone ?? lead.phone ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Property name" htmlFor="lead-property">
            <Input
              id="lead-property"
              name="propertyName"
              defaultValue={lead.propertyName ?? ""}
            />
          </Field>
          <Field label="Property address" htmlFor="lead-address">
            <Input
              id="lead-address"
              name="resolvedAddress"
              defaultValue={lead.resolvedAddress ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company / Account</CardTitle>
          <CardDescription className="text-xs">
            The management company associated with this lead.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label="Company" htmlFor="lead-company">
            <Input
              id="lead-company"
              name="company"
              defaultValue={contact?.accountName ?? lead.company ?? ""}
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

function OutreachCard({
  lead,
  contactName,
  members,
  attempts,
}: {
  lead: Lead;
  contactName: string | null;
  members: AssignableMember[];
  attempts: ContactAttempt[];
}) {
  const lastLabel = lead.lastContactedAt
    ? formatExact(new Date(lead.lastContactedAt))
    : null;
  const count = lead.contactAttempts ?? 0;
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
                  ({count} {count === 1 ? "attempt" : "attempts"})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/60">Never</span>
            )}
          </span>
        </div>

        {attempts.length > 1 && (
          <ul className="flex flex-col gap-1 border-t pt-2">
            {attempts.map((a, i) => (
              <li
                key={a.id}
                className="flex items-baseline justify-between text-xs text-muted-foreground"
              >
                <span>Attempt {attempts.length - i}</span>
                <span className="tabular-nums">
                  {formatExact(new Date(a.occurredAt))}
                </span>
              </li>
            ))}
          </ul>
        )}

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
          <Label
            htmlFor={`assignee-${lead.id}`}
            className="text-xs text-muted-foreground"
          >
            Who&apos;s it for? Saving creates the task
            {contactName ? ` “Follow up: ${lead.name} (${contactName})”` : ""}{" "}
            for them.
          </Label>
          <select
            id={`assignee-${lead.id}`}
            name="assignedTo"
            defaultValue={members.length === 1 ? members[0].userId : ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="" disabled>
              Assign to…
            </option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.label}
              </option>
            ))}
          </select>
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

/** Exact stamp (Jordan C7): "Jul 16, 2026, 2:41 PM" — never just "Just now". */
function formatExact(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
