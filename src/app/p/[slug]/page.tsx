import { cache } from "react";
import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
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
  ACCESS_TYPE_LABELS,
  BUILDING_ARCHETYPE_LABELS,
  type AccessType,
  type BuildingArchetype,
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

// Deduped across generateMetadata + the page render (one query per request).
const getShare = cache(getProposalShareBySlug);

/**
 * Resolving the share here — before the body streams — is what makes an
 * invalid link an actual HTTP 404: the root loading.tsx suspense boundary
 * otherwise commits a 200 shell before the page's notFound() can run.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const record = await getShare(slug);
  if (!record) notFound();
  const snapshot = getSnapshot(record.proposal.snapshot);
  return {
    title: snapshot
      ? `Proposal — ${snapshot.propertyName}`
      : "Proposal — Mercer",
  };
}

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await getShare(slug);
  if (!record) notFound();

  // Every view: bump view_count (accessedAt keeps first-view semantics).
  after(async () => {
    try {
      await markProposalShareAccessed(slug);
    } catch (err) {
      console.error("[shared-proposal] markProposalShareAccessed failed", err);
    }
  });

  const snapshot = getSnapshot(record.proposal.snapshot);
  if (!snapshot) notFound();

  const isAccepted = Boolean(record.share.acceptedAt);
  const isDeclined = Boolean(record.share.declinedAt);
  const committedLines = snapshot.lineItems.filter((li) => !li.rateOnly);
  const rateLines = snapshot.lineItems.filter((li) => li.rateOnly === true);
  const brand = snapshot.brand ?? null;
  const accent = brand?.accentColor ?? brand?.primaryColor ?? null;
  const coverLetter = renderCoverLetter(
    brand?.coverLetterTemplate ?? null,
    record.share.recipientName,
    snapshot,
  );
  const parties = snapshot.parties ?? null;
  const hasParties =
    parties != null &&
    Boolean(
      parties.managementCompany ||
        parties.ownerName ||
        parties.ownerAddress ||
        parties.ntoRecipientName,
    );
  const accessItems = snapshot.accessItems ?? [];
  const archetypeBuildings = snapshot.buildings.filter((b) => b.archetype);
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      {/* Branded masthead — present on snapshots stamped with a company
          profile; older proposals render the plain header below. */}
      {brand?.companyName && (
        <div
          className="flex items-center gap-3 border-b pb-4"
          style={accent ? { borderColor: accent } : undefined}
        >
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={`${brand.companyName} logo`}
              className="h-10 w-auto max-w-[140px] object-contain"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {brand.companyName}
            </p>
            {brand.tagline && (
              <p className="truncate text-xs text-muted-foreground">
                {brand.tagline}
              </p>
            )}
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground">
            {brand.phone && <p>{brand.phone}</p>}
            {brand.email && <p>{brand.email}</p>}
          </div>
        </div>
      )}

      {snapshot.coverPhotoUrl ? (
        <div className="relative overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={snapshot.coverPhotoUrl}
            alt={snapshot.propertyName}
            className="h-56 w-full object-cover sm:h-72"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-4 pt-16">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">
                  Proposal
                </p>
                <h1 className="text-2xl font-semibold text-white">
                  {snapshot.propertyName}
                </h1>
                <p className="text-sm text-white/80">{snapshot.address}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {isAccepted
                  ? "ACCEPTED"
                  : isDeclined
                    ? "DECLINED"
                    : `QUOTE V${record.proposal.version}`}
              </Badge>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {brand?.companyName
                ? `${brand.companyName} Proposal`
                : "Mercer Proposal"}
            </p>
            <h1 className="text-2xl font-semibold">{snapshot.propertyName}</h1>
            <p className="text-sm text-muted-foreground">{snapshot.address}</p>
          </div>
          {/* This badge is about THIS quote link, not the bid — a customer
              opening a fresh v4 link must not see the bid's internal
              WON/DRAFT state. */}
          <Badge variant="secondary">
            {isAccepted
              ? "ACCEPTED"
              : isDeclined
                ? "DECLINED"
                : `QUOTE V${record.proposal.version}`}
          </Badge>
        </div>
      )}

      {coverLetter && (
        <Card>
          <CardContent className="pt-6">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {coverLetter}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {[brand?.companyName, brand?.phone, brand?.email]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </CardContent>
        </Card>
      )}

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
            {snapshot.totalSqft > 0 && (
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total area</p>
                <p className="text-sm font-medium">
                  {snapshot.totalSqft.toLocaleString()} sqft
                </p>
              </div>
            )}
          </div>
          {archetypeBuildings.length > 0 && (
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Buildings</p>
              <ul className="mt-1 text-sm">
                {archetypeBuildings.map((b, i) => (
                  <li key={i}>
                    {b.label}
                    {b.count > 1 ? ` (x${b.count})` : ""} ·{" "}
                    <span className="text-muted-foreground">
                      {BUILDING_ARCHETYPE_LABELS[
                        b.archetype as BuildingArchetype
                      ] ?? b.archetype}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <EvidenceStrip lines={committedLines} />
          {committedLines.length > 0 && (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Line item</th>
                    <th className="p-3 text-right font-medium">Qty</th>
                    <th className="p-3 text-right font-medium">Unit price</th>
                    <th className="p-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {committedLines.map((li, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">{li.name}</td>
                      <td className="p-3 text-right tabular-nums">
                        {li.qty != null ? li.qty.toLocaleString() : "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {li.unitPrice != null
                          ? formatCurrency(li.unitPrice)
                          : "—"}
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">
                        {formatCurrency(li.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rateLines.length > 0 && (
            <div className="rounded-md border">
              <div className="border-b bg-muted/40 p-3">
                <p className="text-sm font-medium">Unit rates — as found work</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Billed at the listed rate as work is found and approved. Not
                  included in the bid total.
                </p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {rateLines.map((li, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">{li.name}</td>
                      <td className="p-3 text-right font-medium tabular-nums">
                        {li.unitPrice != null
                          ? `${formatCurrency(li.unitPrice)}${li.unit ? ` / ${li.unit}` : ""}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="rounded-md border p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Bid total</p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(snapshot.grandTotal)}
                </p>
              </div>
              {record.proposal.pdfUrl && (
                <a
                  href={record.proposal.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Download PDF
                </a>
              )}
            </div>
          </div>
          {snapshot.notes && (
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{snapshot.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasParties && parties && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Ownership & Notice to Owner
            </CardTitle>
            <CardDescription>
              Captured at the time this proposal was generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Management company
              </p>
              <p className="text-sm font-medium">
                {parties.managementCompany ?? "—"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Legal owner</p>
              <p className="text-sm font-medium">
                {parties.ownerName ?? "—"}
              </p>
            </div>
            <div className="rounded-md border p-3 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Owner address</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {parties.ownerAddress ?? "—"}
              </p>
            </div>
            <div className="rounded-md border p-3 sm:col-span-2">
              <p className="text-xs text-muted-foreground">
                Notice to Owner recipient
              </p>
              <p className="text-sm font-medium">
                {parties.ntoRecipientName ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {accessItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Access</CardTitle>
            <CardDescription>
              Lifts, scaffolding, and other access methods included in the
              bid total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {accessItems.map((item, i) => {
                const meta: string[] = [];
                if (item.quantity != null) meta.push(`qty ${item.quantity}`);
                if (item.durationDays != null)
                  meta.push(`${item.durationDays} d`);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {ACCESS_TYPE_LABELS[item.type as AccessType] ??
                          item.type}
                        {item.method ? ` — ${item.method}` : ""}
                      </p>
                      {meta.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {meta.join(" · ")}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {formatCurrency(item.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {brand && (brand.aboutBlurb || brand.credentials) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              About {brand.companyName ?? "the contractor"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {brand.aboutBlurb && (
              <p className="text-sm leading-relaxed">{brand.aboutBlurb}</p>
            )}
            {brand.credentials && (
              <p className="text-xs text-muted-foreground">
                {brand.credentials}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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

      <p className="pb-4 text-center text-[11px] text-muted-foreground">
        {brand?.companyName
          ? `Prepared by ${brand.companyName}`
          : "Prepared with Mercer"}
        {brand?.credentials ? ` · ${brand.credentials}` : ""}
      </p>
    </main>
  );
}

/**
 * The cover letter is the handshake: template merge fields filled per share.
 * No template + no recipient → no letter (older proposals stay unchanged).
 */
function renderCoverLetter(
  template: string | null,
  recipientName: string | null,
  snapshot: ProposalSnapshot,
): string | null {
  const recipient = recipientName?.trim() || null;
  const base =
    template?.trim() ||
    (recipient
      ? `{recipient}, thank you for the opportunity to bid ${snapshot.propertyName}. Every line in this proposal is itemized below — the price you see is the price you pay, and we're glad to walk through any of it.`
      : null);
  if (!base) return null;
  return base
    .replaceAll("{recipient}", recipient ?? snapshot.clientName)
    .replaceAll("{property}", snapshot.propertyName)
    .replaceAll("{total}", formatCurrency(snapshot.grandTotal));
}

/** Evidence photos beside the lines they justify — the scope story. */
function EvidenceStrip({
  lines,
}: {
  lines: ProposalSnapshot["lineItems"];
}) {
  const urls = [
    ...new Set(
      lines
        .map((li) => li.evidencePhotoUrl)
        .filter((u): u is string => Boolean(u)),
    ),
  ].slice(0, 6);
  if (urls.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        From the property walk
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {urls.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Takeoff photo"
              loading="lazy"
              className="aspect-square w-full rounded-md border object-cover"
            />
          </a>
        ))}
      </div>
    </div>
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
