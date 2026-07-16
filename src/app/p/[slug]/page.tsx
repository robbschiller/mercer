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
  getAcceptedVersionForBid,
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
  const isExpired =
    !isAccepted &&
    !isDeclined &&
    record.share.expiresAt != null &&
    record.share.expiresAt.getTime() < Date.now();
  // A link for an OLDER version than the one already accepted is superseded —
  // it renders read-only. Newer versions (revisions) stay acceptable.
  const acceptedVersion = isAccepted
    ? null
    : await getAcceptedVersionForBid(record.bid.id);
  const isSuperseded =
    acceptedVersion != null &&
    (record.proposal.version ?? 0) < acceptedVersion;
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
  // Sales-document copy layer (§A2) — absent on older snapshots, and any
  // slot may be null. Every section below degrades to the pre-A2 layout.
  const doc = snapshot.document ?? null;
  const promises = doc?.promises ?? [];
  const statChips = doc?.statChips ?? [];
  const included = doc?.included ?? [];
  const paymentSchedule = doc?.paymentSchedule ?? [];
  const whatToExpect = doc?.whatToExpect ?? [];
  const testimonials = doc?.testimonials ?? [];
  const terms = doc?.terms ?? [];
  const hasWhyUs =
    Boolean(doc?.whyUsHeadline || doc?.whyUsBody) ||
    promises.length > 0 ||
    statChips.length > 0;
  const priceHeldDate = doc?.priceHeldThrough
    ? formatHeldThrough(doc.priceHeldThrough)
    : null;
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
        signature={record.share.acceptedSignature}
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
                {doc?.coverSubtitle && (
                  <p className="mt-1 max-w-prose text-sm leading-snug text-white/85">
                    {doc.coverSubtitle}
                  </p>
                )}
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
            {doc?.coverSubtitle && (
              <p className="mt-1 max-w-prose text-sm leading-snug">
                {doc.coverSubtitle}
              </p>
            )}
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

      {hasWhyUs && (
        <Card>
          <CardHeader>
            {doc?.whyUsHeadline ? (
              <CardTitle
                className="text-2xl leading-snug"
                style={{
                  fontFamily: "var(--font-instrument), ui-serif, serif",
                }}
              >
                {doc.whyUsHeadline}
              </CardTitle>
            ) : (
              <CardTitle className="text-lg">
                Why {brand?.companyName ?? "us"}
              </CardTitle>
            )}
            {doc?.whyUsBody && (
              <CardDescription className="text-sm leading-relaxed text-foreground/80">
                {doc.whyUsBody}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {promises.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {promises.map((p, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p
                      className="text-sm font-semibold"
                      style={accent ? { color: accent } : undefined}
                    >
                      {p.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {statChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {statChips.map((c, i) => (
                  <div
                    key={i}
                    className="min-w-[110px] flex-1 rounded-md border bg-muted/40 p-3 text-center"
                  >
                    <p className="text-lg font-semibold tabular-nums">
                      {c.value}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scope & pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {doc?.scopeIntro && (
            <p className="text-sm leading-relaxed">{doc.scopeIntro}</p>
          )}
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
          {included.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What&apos;s included
              </p>
              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {included.map((item, i) => (
                  <p key={i} className="text-sm leading-snug">
                    <span
                      className="font-semibold"
                      style={accent ? { color: accent } : undefined}
                    >
                      {boldLead(item.title)}
                    </span>{" "}
                    {item.body}
                  </p>
                ))}
              </div>
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
                {doc?.publishedRatesIntro && (
                  <p className="mt-1 text-sm leading-relaxed">
                    {doc.publishedRatesIntro}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Billed at the listed rate as work is found and approved. Not
                  included in the quote total.
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
                <p className="text-xs text-muted-foreground">Quote total</p>
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
            {(doc?.perSf != null ||
              doc?.perUnit != null ||
              doc?.durationLine) && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
                {doc?.perSf != null && (
                  <span className="tabular-nums">
                    <span className="font-medium text-foreground">
                      {formatCurrency(doc.perSf)}
                    </span>{" "}
                    per square foot
                  </span>
                )}
                {doc?.perUnit != null && (
                  <span className="tabular-nums">
                    <span className="font-medium text-foreground">
                      {formatWholeCurrency(doc.perUnit)}
                    </span>{" "}
                    per unit
                    {doc.unitCount != null
                      ? ` · ${doc.unitCount.toLocaleString()} units`
                      : ""}
                  </span>
                )}
                {doc?.durationLine && <span>{doc.durationLine}</span>}
              </div>
            )}
          </div>
          {paymentSchedule.length > 0 && (
            <div className="rounded-md border">
              <div className="border-b bg-muted/40 p-3">
                <p className="text-sm font-medium">Payment schedule</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Milestone</th>
                    <th className="p-3 text-right font-medium">Share</th>
                    <th className="p-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSchedule.map((m, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">{m.milestone}</td>
                      <td className="p-3 text-right tabular-nums">
                        {Math.round(m.sharePct)}%
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">
                        {formatCurrency(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {doc?.scheduleBody && (
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Schedule</p>
              <p className="mt-1 text-sm leading-relaxed">
                {doc.scheduleBody}
              </p>
            </div>
          )}
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
              quote total.
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

      {(whatToExpect.length > 0 || testimonials.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What to expect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatToExpect.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {whatToExpect.map((step, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p
                      className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                      style={accent ? { color: accent } : undefined}
                    >
                      Step {i + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {testimonials.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {testimonials.map((t, i) => (
                  <div key={i} className="rounded-md border bg-muted/40 p-3">
                    <p className="text-sm italic leading-relaxed">
                      &ldquo;{stripQuotes(t.quote)}&rdquo;
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.attribution}
                    </p>
                  </div>
                ))}
              </div>
            )}
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

      {(terms.length > 0 || priceHeldDate) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms of this proposal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {terms.length > 0 && (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                {terms.map((term, i) => (
                  <li key={i}>
                    <TermText text={term} />
                  </li>
                ))}
              </ul>
            )}
            {priceHeldDate && (
              <div
                className="rounded-md border p-3 text-sm"
                style={accent ? { borderColor: accent } : undefined}
              >
                <span
                  className="font-semibold"
                  style={accent ? { color: accent } : undefined}
                >
                  This price is held through {priceHeldDate}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isSuperseded ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              A newer version was accepted
            </CardTitle>
            <CardDescription>
              This quote (v{record.proposal.version}) was superseded — version{" "}
              {acceptedVersion} of this proposal has already been accepted.
              This page stays for reference only.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isExpired ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This link has expired</CardTitle>
            <CardDescription>
              Pricing this old needs a fresh look — contact{" "}
              {brand?.companyName ?? "your contractor"}
              {brand?.phone ? ` at ${brand.phone}` : ""} for an updated
              proposal.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Respond</CardTitle>
          </CardHeader>
          <CardContent>
            {doc?.acceptanceCta && (
              <p className="mb-4 text-sm leading-relaxed">
                {doc.acceptanceCta}
              </p>
            )}
            <PublicProposalResponse
              slug={slug}
              isAccepted={isAccepted}
              isDeclined={isDeclined}
              acceptedByName={record.share.acceptedByName}
              acceptedByTitle={record.share.acceptedByTitle}
              declineReason={record.share.declineReason}
              clientName={snapshot.clientName}
            />
          </CardContent>
        </Card>
      )}

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
      ? `{recipient}, thank you for the opportunity to quote ${snapshot.propertyName}. Every line in this proposal is itemized below — the price you see is the price you pay, and we're glad to walk through any of it.`
      : null);
  if (!base) return null;
  return base
    .replaceAll("{recipient}", recipient ?? snapshot.clientName)
    .replaceAll("{property}", snapshot.propertyName)
    .replaceAll("{total}", formatCurrency(snapshot.grandTotal));
}

/** Whole-dollar money for per-unit stats ("$1,478 per unit"). */
const wholeCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatWholeCurrency(amount: number): string {
  return wholeCurrency.format(amount);
}

/** ISO date → "December 31, 2026" (UTC so a date-only string can't roll back a day). */
function formatHeldThrough(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Pressure wash" → "Pressure wash." — the bold lead of a checklist item. */
function boldLead(title: string): string {
  const t = title.trim();
  return /[.:!?]$/.test(t) ? t : `${t}.`;
}

/** Testimonial quotes come with or without their own quote marks — normalize. */
function stripQuotes(quote: string): string {
  return quote.trim().replace(/^["“]/, "").replace(/["”]$/, "");
}

/** Terms carry their own "Price." / "Warranty." lead-ins — bold them. */
function TermText({ text }: { text: string }) {
  const m = text.match(/^(.{1,48}?[.:])\s+([\s\S]+)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="font-semibold">{m[1]}</span> {m[2]}
    </>
  );
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
  signature,
}: {
  snapshot: ProposalSnapshot;
  bidStatus: string;
  project: NonNullable<Awaited<ReturnType<typeof getPublicProjectByBidId>>>;
  signature?: string | null;
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
            <p className="text-xs text-muted-foreground">Quote status</p>
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
            {signature && (
              <p
                className="mt-1 text-xl italic"
                style={{
                  fontFamily: "var(--font-instrument), ui-serif, serif",
                }}
              >
                {signature}
              </p>
            )}
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
