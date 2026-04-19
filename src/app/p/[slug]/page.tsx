import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getProposalShareBySlug,
  getPublicProjectByBidId,
  markProposalShareAccessed,
} from "@/lib/store";
import type { ProposalSnapshot } from "@/lib/pdf/types";
import { formatCurrency } from "@/lib/pricing";
import { PublicProposalResponse } from "@/components/public-proposal-response";
import {
  projectStatusLabel,
  projectStatusVariant,
} from "@/lib/status-meta";

function getSnapshot(snapshot: unknown): ProposalSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const value = snapshot as Partial<ProposalSnapshot>;
  if (
    typeof value.propertyName !== "string" ||
    typeof value.address !== "string" ||
    typeof value.clientName !== "string" ||
    typeof value.totalSqft !== "number" ||
    typeof value.grandTotal !== "number"
  ) {
    return null;
  }
  return value as ProposalSnapshot;
}

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await getProposalShareBySlug(slug);
  if (!record) notFound();

  if (!record.share.accessedAt) {
    after(async () => {
      try {
        await markProposalShareAccessed(slug);
      } catch (err) {
        console.error("[shared-proposal] markProposalShareAccessed failed", err);
      }
    });
  }

  const snapshot = getSnapshot(record.proposal.snapshot);
  if (!snapshot) notFound();

  const isAccepted = Boolean(record.share.acceptedAt);
  const isDeclined = Boolean(record.share.declinedAt);
  // After acceptance the URL pivots to a status page (PRD §5.5). The
  // project row is the trigger; if there's no project, fall back to the
  // proposal-acceptance render (covers older accepted shares from before
  // the project layer existed, plus the not-yet-responded path).
  const project = isAccepted
    ? await getPublicProjectByBidId(record.bid.id)
    : null;

  if (project) {
    return (
      <StatusPage
        snapshot={snapshot}
        bidStatus={record.bid.status}
        project={project}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Mercer Proposal
          </p>
          <h1 className="text-2xl font-semibold">{snapshot.propertyName}</h1>
          <p className="text-sm text-muted-foreground">{snapshot.address}</p>
        </div>
        <Badge variant="secondary">{record.bid.status.toUpperCase()}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scope & pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium">{snapshot.clientName}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total area</p>
              <p className="text-sm font-medium">
                {snapshot.totalSqft.toLocaleString()} sqft
              </p>
            </div>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Bid total</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(snapshot.grandTotal)}
            </p>
          </div>
          {snapshot.notes && (
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{snapshot.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Respond</CardTitle>
        </CardHeader>
        <CardContent>
          <PublicProposalResponse
            slug={slug}
            isAccepted={isAccepted}
            isDeclined={isDeclined}
            acceptedByName={record.share.acceptedByName}
            acceptedByTitle={record.share.acceptedByTitle}
            declineReason={record.share.declineReason}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusPage({
  snapshot,
  bidStatus,
  project,
}: {
  snapshot: ProposalSnapshot;
  bidStatus: string;
  project: NonNullable<Awaited<ReturnType<typeof getPublicProjectByBidId>>>;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Project status
          </p>
          <h1 className="text-2xl font-semibold">{snapshot.propertyName}</h1>
          <p className="text-sm text-muted-foreground">{snapshot.address}</p>
        </div>
        <Badge variant={projectStatusVariant(project.status)}>
          {projectStatusLabel(project.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schedule</CardTitle>
          <CardDescription>
            Live dates from the contractor. Targets shift as the project
            progresses; actuals stamp automatically when work starts and
            wraps.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Target start</p>
            <p className="text-sm font-medium">
              {formatDate(project.targetStartDate)}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Target end</p>
            <p className="text-sm font-medium">
              {formatDate(project.targetEndDate)}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Actual start</p>
            <p className="text-sm font-medium">
              {formatDate(project.actualStartDate)}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Actual end</p>
            <p className="text-sm font-medium">
              {formatDate(project.actualEndDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      {(project.assignedSub || project.crewLeadName) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">On site</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {project.assignedSub && (
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Crew</p>
                <p className="text-sm font-medium">{project.assignedSub}</p>
              </div>
            )}
            {project.crewLeadName && (
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Crew lead</p>
                <p className="text-sm font-medium">{project.crewLeadName}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Updates</CardTitle>
          <CardDescription>
            Progress notes shared by the crew. Newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No updates posted yet. Check back as work begins.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {project.updates.map((u) => (
                <li
                  key={u.id}
                  className="rounded-md border bg-card/50 p-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                    {u.authorName ? ` · ${u.authorName}` : ""}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">
                    {u.body}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Original proposal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Client</p>
            <p className="text-sm font-medium">{snapshot.clientName}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Bid status</p>
            <p className="text-sm font-medium">{bidStatus.toUpperCase()}</p>
          </div>
          <div className="rounded-md border p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Accepted</p>
            <p className="text-sm font-medium">
              {project.acceptedByName ?? "—"}
              {project.acceptedByTitle ? `, ${project.acceptedByTitle}` : ""}
              {project.acceptedAt
                ? ` on ${formatDate(project.acceptedAt)}`
                : ""}
            </p>
          </div>
          <div className="rounded-md border p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Contract value</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(snapshot.grandTotal)}
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
