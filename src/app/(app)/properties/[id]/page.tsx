import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Building,
  ChevronsUp,
  CirclePlus,
  ContactRound,
  FileText,
  GitCommitVertical,
  HardHat,
  Images,
  Landmark,
  LayoutGrid,
  MapPin,
  PaintRoller,
  Repeat,
  Ruler,
  Satellite,
  User,
  UserPlus,
  Wind,
  Wrench,
} from "lucide-react";
import {
  getPropertyDetail,
  getPropertyRelationshipHistory,
  getPropertyDeals,
  getPhotos,
  type PropertyDeal,
  type RelationshipRow,
} from "@/lib/store";
import { PropertyDetailPanel } from "@/components/property-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import {
  startPropertyRelationshipAction,
  endPropertyRelationshipAction,
  updatePropertySpecsAction,
  uploadPhotoAction,
} from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { projectStatusLabel, type ProjectStatus } from "@/lib/status-meta";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
function moneyK(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
function monthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const REPAINT_CYCLE_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;

type Outcome = { label: string; cls: string };
function dealOutcome(d: PropertyDeal): Outcome {
  if (d.kind === "job") {
    if (d.status === "complete" || d.status === "warranty_watch")
      return { label: "Completed", cls: "border bg-muted/60 text-foreground/70" };
    return {
      label: projectStatusLabel(d.status as ProjectStatus),
      cls: "border border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-400",
    };
  }
  if (d.status === "won")
    return {
      label: "Won",
      cls: "border border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
    };
  if (d.status === "lost")
    return {
      label: "Lost",
      cls: "border border-destructive/25 bg-destructive/10 text-destructive",
    };
  return {
    label: "Open",
    cls: "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
}

function DealIcon({ kind }: { kind: PropertyDeal["kind"] | "due" }) {
  const cls = "size-3.5";
  switch (kind) {
    case "due":
      return <BellRing className={cls} />;
    case "job":
      return <HardHat className={cls} />;
    case "bid":
      return <FileText className={cls} />;
    default:
      return <UserPlus className={cls} />;
  }
}

const AVATAR_TINTS = [
  "bg-blue-600",
  "bg-rose-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
];
function tintFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default async function PropertyHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [detail, history, photos, deals] = await Promise.all([
    getPropertyDetail(id),
    getPropertyRelationshipHistory(id),
    getPhotos("property", id),
    getPropertyDeals(id),
  ]);
  if (!detail) notFound();

  const { property, managementAccount, account, ownerAccount, ownerParty } =
    detail;
  const label = property.name ?? property.address ?? "Untitled property";
  const mgmtName = managementAccount?.name ?? account?.name ?? null;
  const currentMgmt = history.management.find((r) => r.current) ?? null;
  const ownerName =
    ownerAccount?.name ?? (ownerParty?.legalOwnerName?.trim() || null);

  // ── Ledger math: the repeat-business scoreboard ──
  const jobs = deals.filter((d) => d.kind === "job");
  const bidsAll = deals.filter((d) => d.kind !== "lead");
  const jobsWon = jobs.length;
  const lifetime = jobs.reduce((n, d) => n + (d.value ?? 0), 0);
  const decided =
    jobsWon + bidsAll.filter((d) => d.kind === "bid" && d.status === "lost").length;
  const winRate = decided > 0 ? jobsWon / decided : null;
  const clientSince =
    deals.length > 0
      ? Math.min(...deals.map((d) => d.createdAt.getFullYear()))
      : property.createdAt.getFullYear();

  const hasOpenDeal = deals.some(
    (d) =>
      (d.kind === "lead" &&
        ["needs_takeoff", "takeoff_scheduled", "on_hold"].includes(d.status)) ||
      (d.kind === "bid" && ["draft", "sent"].includes(d.status)) ||
      (d.kind === "job" &&
        d.status !== "complete" &&
        d.status !== "warranty_watch"),
  );
  const lastWon = jobs
    .filter((d) => d.acceptedAt != null)
    .sort((a, b) => b.acceptedAt!.getTime() - a.acceptedAt!.getTime())[0];
  const repaintDue =
    !hasOpenDeal &&
    lastWon?.acceptedAt != null &&
    Date.now() - lastWon.acceptedAt.getTime() > REPAINT_CYCLE_MS;
  const repaintYears = lastWon?.acceptedAt
    ? Math.floor(
        (Date.now() - lastWon.acceptedAt.getTime()) / (365.25 * 86_400_000),
      )
    : null;

  const specPhotos = photos.filter((p) => p.kind === "specs");
  const recordPhotos = photos.filter((p) => p.kind !== "specs");

  const specCells = [
    property.attainableSqftNonfloor != null && {
      icon: Ruler,
      value: Math.round(
        Number(property.attainableSqftNonfloor),
      ).toLocaleString(),
      unit: "sqft · non-floor",
      label: "Paintable area",
    },
    property.attainableSqftFloors != null && {
      icon: LayoutGrid,
      value: Math.round(Number(property.attainableSqftFloors)).toLocaleString(),
      unit: "sqft · floors",
      label: "Floor coatings",
    },
    property.breezewayCount != null && {
      icon: Wind,
      value: String(property.breezewayCount),
      unit: "open-air",
      label: "Breezeways",
    },
    property.stairSystemCount != null && {
      icon: ChevronsUp,
      value: String(property.stairSystemCount),
      unit: "systems",
      label: "Stairs",
    },
  ].filter((c): c is Exclude<typeof c, false> => Boolean(c));

  // ── Relationship bands scale ──
  const allRels = [...history.management, ...history.owner];
  const nowYear = new Date().getFullYear();
  const relStart = allRels.length
    ? Math.min(
        clientSince,
        ...allRels.map((r) => new Date(r.startDate).getFullYear()),
      )
    : clientSince;
  const relEnd = nowYear + 1;

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <BreadcrumbLabel segment={id} label={label} />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Link
        href="/properties"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Properties
      </Link>

      {/* ── Hero ── */}
      <div className="mb-4 grid grid-cols-1 gap-6 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] md:grid-cols-[176px_minmax(0,1fr)] lg:grid-cols-[176px_minmax(0,1fr)_216px]">
        <div className="relative min-h-[150px] overflow-hidden rounded-xl bg-muted">
          {property.satelliteImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.satelliteImageUrl}
              alt="Satellite view"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground/50">
              <Satellite className="size-7" />
            </div>
          )}
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-[3px] text-[10.5px] font-semibold text-white backdrop-blur-sm">
            <Satellite className="size-3" />
            Aerial
          </span>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="min-w-0 truncate text-[25px] font-semibold leading-tight tracking-tight">
              {label}
            </h1>
            {repaintDue ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-[3px] text-xs font-semibold text-amber-700 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Repaint due
              </span>
            ) : hasOpenDeal ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-[3px] text-xs font-semibold text-blue-700 dark:text-blue-400">
                <span className="size-1.5 rounded-full bg-blue-600" />
                Active deal
              </span>
            ) : null}
          </div>
          {property.address && (
            <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-muted-foreground">
              <MapPin className="size-3.5 text-muted-foreground/70" />
              {property.address}
            </p>
          )}
          <div className="mt-auto grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3 sm:gap-5 [&:not(:first-child)]:mt-5">
            <HeroFact
              icon={<Building className="size-3" />}
              label="Management"
              value={mgmtName ?? "—"}
              sub={
                currentMgmt
                  ? `managing since ${new Date(currentMgmt.startDate).getFullYear()}`
                  : mgmtName
                    ? "no dated history yet"
                    : "add one below"
              }
            />
            <HeroFact
              icon={
                ownerAccount?.type === "owner" || ownerParty ? (
                  <Landmark className="size-3" />
                ) : (
                  <User className="size-3" />
                )
              }
              label="Ownership"
              value={ownerName ?? "—"}
              sub={
                ownerParty?.legalOwnerAddress?.trim() ||
                (ownerName ? "legal owner of record" : "not captured yet")
              }
            />
            <HeroFact
              icon={<LayoutGrid className="size-3" />}
              label="Property"
              value={
                property.attainableSqftNonfloor != null
                  ? `${Math.round(Number(property.attainableSqftNonfloor)).toLocaleString()} sqft`
                  : "Specs TBD"
              }
              sub={
                [
                  property.breezewayCount != null &&
                    `${property.breezewayCount} breezeways`,
                  property.stairSystemCount != null &&
                    `${property.stairSystemCount} stair systems`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "takeoff fills this in"
              }
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2.5 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-xs text-muted-foreground">Client since</span>
            <span className="text-[13.5px] font-semibold">{clientSince}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-xs text-muted-foreground">Jobs won</span>
            <span className="text-[13.5px] font-semibold">{jobsWon}</span>
          </div>
          <div className="my-0.5 flex items-baseline justify-between gap-2.5 border-y py-2.5">
            <span className="text-xs font-medium text-foreground/80">
              Lifetime value
            </span>
            <span className="font-mono text-[19px] font-semibold tabular-nums tracking-tight">
              {money.format(lifetime)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-xs text-muted-foreground">Win rate</span>
            <span className="text-[13.5px] font-semibold">
              {winRate != null
                ? `${Math.round(winRate * 100)}% · ${bidsAll.length} bid${bidsAll.length === 1 ? "" : "s"}`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Repaint next-action banner ── */}
      {repaintDue && lastWon?.acceptedAt && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-amber-500/15 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-[0_4px_12px_-3px] shadow-amber-500/50">
            <PaintRoller className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-amber-900 dark:text-amber-200">
              Repaint due — last painted {monthYear(lastWon.acceptedAt)}
              {lastWon.value != null && <> for {money.format(lastWon.value)}</>}
            </p>
            <p className="mt-0.5 text-[12.5px] text-amber-800/80 dark:text-amber-300/80">
              {repaintYears} years on, past the exterior repaint cycle. No open
              deal on this building yet.
            </p>
          </div>
          <Link
            href="/leads/new"
            className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <CirclePlus className="size-3.5" />
            Start lead
          </Link>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_424px]">
        {/* ── Left column ── */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Deals timeline */}
          <Panel
            icon={<GitCommitVertical className="size-[15px]" />}
            title="Deals timeline"
            note={
              deals.length > 0
                ? `every lead, bid & job since ${clientSince}`
                : "nothing here yet"
            }
            right={
              deals.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  <b className="font-semibold text-foreground">{jobsWon}</b>{" "}
                  won ·{" "}
                  <b className="font-mono font-semibold tabular-nums text-foreground">
                    {moneyK(lifetime)}
                  </b>
                </span>
              ) : undefined
            }
          >
            <div className="px-4 pb-2 pt-4">
              {repaintDue && lastWon?.acceptedAt && (
                <TimelineItem
                  kind="due"
                  date={monthYear(new Date())}
                  outcome={{
                    label: "Open",
                    cls: "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  }}
                  title="Repaint due"
                  detail={`${repaintYears} years since the last exterior. No open deal yet.`}
                  highlight
                  last={deals.length === 0}
                />
              )}
              {deals.length === 0 && !repaintDue ? (
                <p className="pb-3 text-sm text-muted-foreground">
                  No deals at this property yet. The first lead starts the
                  story.
                </p>
              ) : (
                deals.map((d, i) => (
                  <TimelineItem
                    key={`${d.kind}-${d.id}`}
                    kind={d.kind}
                    date={monthYear(d.acceptedAt ?? d.createdAt)}
                    outcome={dealOutcome(d)}
                    title={d.name}
                    href={d.href}
                    value={d.value}
                    big={d.kind === "job"}
                    last={i === deals.length - 1}
                  />
                ))
              )}
            </div>
          </Panel>

          {/* Relationship history */}
          <Panel
            icon={<Repeat className="size-[15px]" />}
            title="Relationship history"
            note="managers rotate — the building stays with us"
          >
            <div className="p-4">
              {allRels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No dated relationships yet. Add the management company and
                  owner below — when a manager rotates, the history keeps the
                  building.
                </p>
              ) : (
                <div className="pt-1">
                  <RelBandTrack
                    label="Management"
                    rows={history.management}
                    start={relStart}
                    end={relEnd}
                  />
                  <RelBandTrack
                    label="Ownership"
                    rows={history.owner}
                    start={relStart}
                    end={relEnd}
                  />
                  <div className="relative mt-2 h-4">
                    {Array.from(
                      { length: Math.floor((relEnd - relStart) / 2) + 1 },
                      (_, i) => relStart + i * 2,
                    ).map((y) => (
                      <span
                        key={y}
                        className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground/70"
                        style={{
                          left: `${((y - relStart) / (relEnd - relStart)) * 100}%`,
                        }}
                      >
                        {String(y).slice(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <details className="mt-4 border-t pt-3.5">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Edit history — add or end a relationship
                </summary>
                <div className="mt-3 grid gap-5 sm:grid-cols-2">
                  <RelEditor
                    title="Management companies"
                    kind="management"
                    propertyId={id}
                    rows={history.management}
                  />
                  <RelEditor
                    title="Owners"
                    kind="owner"
                    propertyId={id}
                    rows={history.owner}
                  />
                </div>
              </details>
            </div>
          </Panel>

          {/* Standing photo record */}
          <Panel
            icon={<Images className="size-[15px]" />}
            title="Standing photo record"
            note="the building's visual file over time"
          >
            <div className="p-4">
              {recordPhotos.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  No photos yet — the record starts with the first site visit.
                </p>
              ) : (
                <div className="mb-4 grid grid-cols-2 gap-2.5">
                  {recordPhotos.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.caption ?? "Property photo"}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-px bg-gradient-to-t from-black/65 to-transparent px-2.5 pb-2 pt-4">
                        <b className="text-[11.5px] font-semibold text-white">
                          {p.caption ?? "Untitled"}
                        </b>
                        <span className="font-mono text-[10px] text-white/80">
                          {monthYear(p.createdAt)}
                        </span>
                      </span>
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
                <input type="hidden" name="kind" value="other" />
                <input
                  type="hidden"
                  name="returnTo"
                  value={`/properties/${id}`}
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
          </Panel>
        </div>

        {/* ── Right column ── */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Specs & takeoff */}
          <Panel
            icon={<Ruler className="size-[15px]" />}
            title="Specs & takeoff"
            note="reusable across every bid"
          >
            <div className="p-4">
              {specCells.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {specCells.map((c) => (
                    <div
                      key={c.label}
                      className="flex gap-2.5 rounded-xl border border-border/70 bg-muted/20 p-2.5"
                    >
                      <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-muted text-foreground/60">
                        <c.icon className="size-[15px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                          {c.value}
                          <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">
                            {c.unit}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          {c.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No specs captured yet — fill them in below and every future
                  bid starts warm.
                </p>
              )}

              {property.maintenanceNotes.trim() && (
                <div className="mt-3.5 flex gap-2.5 rounded-xl border bg-amber-500/5 p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <Wrench className="size-3.5" />
                  </span>
                  <div className="min-w-0 text-[12.5px] leading-relaxed text-muted-foreground">
                    <b className="mb-0.5 block font-semibold text-foreground">
                      Maintenance notes
                    </b>
                    {property.maintenanceNotes}
                  </div>
                </div>
              )}

              {specPhotos.length > 0 && (
                <div className="mt-3.5 grid grid-cols-4 gap-2">
                  {specPhotos.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.caption ?? "Spec photo"}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              )}

              <details className="mt-4 border-t pt-3.5">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Edit specs & add spec photos
                </summary>
                <form
                  action={updatePropertySpecsAction}
                  className="mt-3 flex flex-col gap-3"
                >
                  <input type="hidden" name="propertyId" value={id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="spec-sqft-nonfloor" className="text-xs">
                        Paintable sqft — non-floor
                      </Label>
                      <Input
                        id="spec-sqft-nonfloor"
                        name="attainableSqftNonfloor"
                        type="number"
                        min="0"
                        step="1"
                        className="h-8"
                        defaultValue={property.attainableSqftNonfloor ?? ""}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="spec-sqft-floors" className="text-xs">
                        Paintable sqft — floors
                      </Label>
                      <Input
                        id="spec-sqft-floors"
                        name="attainableSqftFloors"
                        type="number"
                        min="0"
                        step="1"
                        className="h-8"
                        defaultValue={property.attainableSqftFloors ?? ""}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="spec-breezeways" className="text-xs">
                        Breezeways
                      </Label>
                      <Input
                        id="spec-breezeways"
                        name="breezewayCount"
                        type="number"
                        min="0"
                        step="1"
                        className="h-8"
                        defaultValue={property.breezewayCount ?? ""}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="spec-stairs" className="text-xs">
                        Stair systems
                      </Label>
                      <Input
                        id="spec-stairs"
                        name="stairSystemCount"
                        type="number"
                        min="0"
                        step="1"
                        className="h-8"
                        defaultValue={property.stairSystemCount ?? ""}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="spec-maintenance" className="text-xs">
                      Maintenance history / known issues
                    </Label>
                    <Textarea
                      id="spec-maintenance"
                      name="maintenanceNotes"
                      placeholder="Recurring leaks, fragile landscaping, gate codes handled by the office…"
                      defaultValue={property.maintenanceNotes}
                      className="min-h-16"
                    />
                  </div>
                  <div>
                    <SubmitButton size="sm">Save specs</SubmitButton>
                  </div>
                </form>
                <form
                  action={uploadPhotoAction}
                  className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3"
                >
                  <input type="hidden" name="contextType" value="property" />
                  <input type="hidden" name="contextId" value={id} />
                  <input type="hidden" name="kind" value="specs" />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`/properties/${id}`}
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
                    placeholder="Spec photo caption"
                    className="h-8 w-40 text-xs"
                  />
                  <SubmitButton variant="outline" size="sm">
                    Upload
                  </SubmitButton>
                </form>
              </details>
            </div>
          </Panel>

          {/* Contacts at property */}
          <Panel
            icon={<ContactRound className="size-[15px]" />}
            title="Contacts at property"
            note={`${detail.contacts.length} ${detail.contacts.length === 1 ? "person" : "people"}`}
          >
            {detail.contacts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nobody linked yet — attach contacts from the panel below so
                the next bid knows who decides.
              </p>
            ) : (
              <div className="flex flex-col">
                {detail.contacts.map((c, i) => (
                  <Link
                    key={c.contact.id}
                    href={`/contacts/${c.contact.id}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                      i > 0 && "border-t border-border/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-[34px] shrink-0 place-items-center rounded-full text-[11.5px] font-bold text-white",
                        tintFor(c.contact.name),
                      )}
                    >
                      {initials(c.contact.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">
                        {c.contact.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.contact.title ?? c.contact.email ?? "—"}
                      </span>
                    </span>
                    {c.role && (
                      <span className="shrink-0 rounded-full border bg-muted/60 px-2.5 py-px text-[11px] font-semibold text-muted-foreground">
                        {c.role}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Everything else — parties, leads, portfolio — stays reachable. */}
      <details className="mt-6 rounded-2xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <summary className="cursor-pointer text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
          Manage property & parties — ownership, NTO recipient, linked leads
        </summary>
        <div className="mt-4">
          <PropertyDetailPanel
            detail={detail}
            closeHref="/properties"
            buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
            buildContactHref={(contactId) => `/contacts/${contactId}`}
            buildLeadHref={(leadId) => `/leads/${leadId}`}
          />
        </div>
      </details>
    </div>
  );
}

function HeroFact({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="truncate text-[13.5px] font-semibold">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Panel({
  icon,
  title,
  note,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-muted text-foreground/60">
          {icon}
        </span>
        <span className="shrink-0 text-[13.5px] font-semibold tracking-tight">
          {title}
        </span>
        {note && (
          <span className="min-w-0 truncate text-xs text-muted-foreground/80">
            · {note}
          </span>
        )}
        {right && <span className="ml-auto shrink-0">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function TimelineItem({
  kind,
  date,
  outcome,
  title,
  detail,
  href,
  value,
  big,
  highlight,
  last,
}: {
  kind: PropertyDeal["kind"] | "due";
  date: string;
  outcome: Outcome;
  title: string;
  detail?: string;
  href?: string;
  value?: number | null;
  big?: boolean;
  highlight?: boolean;
  last?: boolean;
}) {
  const nodeCls =
    kind === "due"
      ? "border-amber-500 bg-amber-500 text-white"
      : kind === "job"
        ? "border-foreground bg-foreground text-background"
        : kind === "lead"
          ? "border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-400"
          : "border-border bg-muted/60 text-foreground/70";
  const body = (
    <div
      className={cn(
        "min-w-0 pt-0.5",
        (big || highlight) && "-mt-0.5 rounded-xl border p-3",
        big && !highlight && "border-border/70 bg-muted/20",
        highlight && "border-amber-500/30 bg-amber-500/10",
      )}
    >
      <div className="mb-1 flex items-center gap-2.5">
        <span className="font-mono text-xs tabular-nums text-muted-foreground/80">
          {date}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-px text-[10.5px] font-semibold",
            outcome.cls,
          )}
        >
          {outcome.label}
        </span>
        {value != null ? (
          <span className="ml-auto font-mono text-[13.5px] font-medium tabular-nums">
            {money.format(value)}
          </span>
        ) : (
          <span className="ml-auto text-[11px] text-muted-foreground/70">
            {kind === "lead" ? "Lead" : kind === "due" ? "Opportunity" : ""}
          </span>
        )}
      </div>
      <p
        className={cn(
          "text-sm font-semibold tracking-tight",
          highlight && "text-amber-900 dark:text-amber-200",
        )}
      >
        {title}
      </p>
      {detail && (
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {detail}
        </p>
      )}
    </div>
  );
  return (
    <div className="relative grid grid-cols-[30px_minmax(0,1fr)] gap-3.5 pb-5">
      {!last && (
        <span className="absolute bottom-0 left-[14px] top-[30px] w-[2px] bg-border" />
      )}
      <span
        className={cn(
          "relative z-[1] grid size-[30px] place-items-center rounded-full border",
          nodeCls,
        )}
      >
        <DealIcon kind={kind} />
      </span>
      {href ? (
        <Link href={href} className="block min-w-0 hover:opacity-90">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

function RelBandTrack({
  label,
  rows,
  start,
  end,
}: {
  label: string;
  rows: RelationshipRow[];
  start: number;
  end: number;
}) {
  const span = end - start;
  const pos = (y: number) => Math.max(0, Math.min(100, ((y - start) / span) * 100));
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </p>
      <div className="relative h-9 rounded-lg bg-muted/60 shadow-[inset_0_0_0_1px] shadow-border/60">
        {rows.length === 0 && (
          <span className="absolute inset-0 grid place-items-center text-[11px] italic text-muted-foreground/60">
            none recorded
          </span>
        )}
        {rows.map((r) => {
          const s = new Date(r.startDate).getFullYear();
          const e = r.endDate ? new Date(r.endDate).getFullYear() : end;
          const left = pos(s);
          const width = Math.max(pos(e) - left, 6);
          return (
            <span
              key={r.id}
              className={cn(
                "absolute inset-y-1 flex items-center gap-2 overflow-hidden rounded-md px-2.5",
                r.current
                  ? "bg-foreground text-background"
                  : "bg-foreground/15 text-foreground/80",
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="truncate text-xs font-medium">
                {r.accountName}
              </span>
              {r.current && (
                <span className="ml-auto shrink-0 rounded bg-background/20 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-background/80">
                  now
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RelEditor({
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
                  {r.startDate} – {r.endDate ?? "present"}
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
        <Input
          type="date"
          name="startDate"
          required
          className="h-7 w-36 text-xs"
        />
        <SubmitButton variant="outline" size="sm">
          Add
        </SubmitButton>
      </form>
    </div>
  );
}
