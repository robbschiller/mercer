import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProject,
  getProjectUpdates,
  allowedProjectStatusTransitions,
  type ProjectStatus,
} from "@/lib/store";
import {
  updateProjectStatusAction,
  updateProjectDetailsAction,
  createProjectUpdateAction,
} from "@/lib/actions";
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
  bidStatusLabel,
  bidStatusVariant,
  projectStatusLabel,
  projectStatusVariant,
} from "@/lib/status-meta";

const STATUS_DESCRIPTIONS: Record<ProjectStatus, string> = {
  not_started:
    "Awaiting kickoff. Pick a target start and assign a sub when you have one.",
  in_progress:
    "Crew is on site. Move to punch out when remaining items are walk-list only.",
  punch_out:
    "Closing out — final walks and remaining items. Mark complete when done.",
  complete:
    "Wrapped. Reopen to punch out or in progress if items resurface — the actual end date will clear and re-stamp on the next complete.",
  on_hold:
    "Paused (weather, owner, sub availability). Resume by moving back to in progress.",
};

const TRANSITION_LABELS: Record<ProjectStatus, string> = {
  not_started: "Reset to not started",
  in_progress: "Move to in progress",
  punch_out: "Move to punch out",
  complete: "Mark complete",
  on_hold: "Put on hold",
};

function transitionLabel(
  current: ProjectStatus,
  next: ProjectStatus
): string {
  if (current === "complete") {
    if (next === "punch_out") return "Reopen to punch out";
    if (next === "in_progress") return "Reopen to in progress";
  }
  return TRANSITION_LABELS[next];
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString();
}

function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProject(id);
  if (!data) notFound();

  const { project, bid } = data;
  const transitions = allowedProjectStatusTransitions(project.status);
  const updates = await getProjectUpdates(project.id);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/bids/${bid.id}`}>&larr; Back to bid</Link>
        </Button>
      </div>

      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            {bid.propertyName}
          </h1>
          {bid.address && (
            <p className="text-sm text-muted-foreground">{bid.address}</p>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Badge variant={projectStatusVariant(project.status)}>
            {projectStatusLabel(project.status)}
          </Badge>
          {project.acceptedByName && (
            <p className="text-xs text-muted-foreground">
              Accepted by {project.acceptedByName}
              {project.acceptedByTitle ? `, ${project.acceptedByTitle}` : ""}
              {project.acceptedAt
                ? ` on ${formatDate(project.acceptedAt)}`
                : ""}
            </p>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bid context</CardTitle>
          <CardDescription>
            The accepted bid is the contract artifact — frozen, read-only.
            Scope changes need a new bid.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Client</p>
            <p>{bid.clientName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bid status</p>
            <Badge variant={bidStatusVariant(bid.status)}>
              {bidStatusLabel(bid.status)}
            </Badge>
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/bids/${bid.id}`}>Open bid</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>{STATUS_DESCRIPTIONS[project.status]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {transitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No further transitions available from this state.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((next) => (
                <form key={next} action={updateProjectStatusAction}>
                  <input type="hidden" name="id" value={project.id} />
                  <input type="hidden" name="status" value={next} />
                  <SubmitButton variant="outline" size="sm">
                    {transitionLabel(project.status, next)}
                  </SubmitButton>
                </form>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Entering <em>in progress</em> stamps the actual start date if it
            isn&apos;t already set; entering <em>complete</em> stamps the
            actual end date.
          </p>
        </CardContent>
      </Card>

      <Card>
        <form action={updateProjectDetailsAction}>
          <input type="hidden" name="id" value={project.id} />
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
            <CardDescription>
              Schedule, assignment, and contractor-only notes. Updates here
              never appear on the customer&apos;s proposal URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="targetStartDate">Target start</Label>
                <Input
                  id="targetStartDate"
                  name="targetStartDate"
                  type="date"
                  defaultValue={project.targetStartDate ?? ""}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="targetEndDate">Target end</Label>
                <Input
                  id="targetEndDate"
                  name="targetEndDate"
                  type="date"
                  defaultValue={project.targetEndDate ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Actual start</p>
                <p>{formatDateTime(project.actualStartDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actual end</p>
                <p>{formatDateTime(project.actualEndDate)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="assignedSub">Assigned sub</Label>
                <Input
                  id="assignedSub"
                  name="assignedSub"
                  defaultValue={project.assignedSub ?? ""}
                  placeholder="e.g. Dante Painting"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="crewLeadName">Crew lead</Label>
                <Input
                  id="crewLeadName"
                  name="crewLeadName"
                  defaultValue={project.crewLeadName ?? ""}
                  placeholder="On-site point of contact"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={project.notes}
                placeholder="Internal notes, kickoff plan, gotchas…"
              />
            </div>

            <div>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project updates</CardTitle>
          <CardDescription>
            Append-only progress feed. Tick &ldquo;Visible to property
            manager&rdquo; to surface a single entry on the post-acceptance
            status page; everything else stays internal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            action={createProjectUpdateAction}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="body" className="sr-only">
                Update
              </Label>
              <Textarea
                id="body"
                name="body"
                rows={3}
                placeholder="Crew arrived, prep started on the south elevation…"
                required
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="visibleOnPublicUrl"
                  className="size-4 rounded border-input"
                />
                <span>Visible to property manager</span>
              </label>
              <SubmitButton size="sm">Post update</SubmitButton>
            </div>
          </form>

          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No updates yet. The first one shows up here.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {updates.map((u) => (
                <li
                  key={u.id}
                  className="rounded-md border border-border bg-card/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {u.authorName || "Unknown"}
                      {" · "}
                      {formatDateTime(u.createdAt)}
                    </span>
                    {u.visibleOnPublicUrl ? (
                      <Badge variant="outline">Visible publicly</Badge>
                    ) : (
                      <span className="text-muted-foreground/70">Internal</span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">
                    {u.body}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
