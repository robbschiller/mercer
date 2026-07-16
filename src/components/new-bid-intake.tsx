"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Check,
  ChevronsUp,
  Clock,
  CornerDownRight,
  FilePlus,
  GitBranch,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Receipt,
  RotateCcw,
  Ruler,
  Satellite,
  Send,
  Sparkles,
  Tag,
  WandSparkles,
  Wind,
} from "lucide-react";
import { createBidAction } from "@/lib/actions";
import type { KnownBuilding } from "@/lib/store";
import {
  AerialBuildingCard,
  Fact,
  GhostSteps,
  PropertyFinder,
  buildingAddress,
  buildingName,
  moneyK,
  monthYear,
  type FinderBuilding,
} from "@/components/property-finder";
import { cn } from "@/lib/utils";

export type BidLeadPrefill = {
  id: string;
  /** The lead's project name — flows through as the opportunity's name (B3). */
  name: string;
  propertyName: string;
  address: string;
  clientName: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  propertyId: string | null;
  isLargeJob: boolean;
};

const SIZES = {
  small: {
    title: "Small job",
    Icon: Clock,
    dur: "Days, one crew",
    bill: "Deposit + final invoice",
  },
  large: {
    title: "Large job",
    Icon: Building2,
    dur: "≥ 2 weeks, phased",
    bill: "Draw billing on milestones",
  },
} as const;

export function NewBidIntake({
  initialLead,
  error,
}: {
  initialLead: BidLeadPrefill | null;
  error: string | null;
}) {
  const [building, setBuilding] = useState<FinderBuilding | null>(() =>
    initialLead
      ? {
          kind: "place",
          name: initialLead.propertyName || initialLead.address,
          address: initialLead.address,
          lat: initialLead.latitude,
          lng: initialLead.longitude,
          placeId: initialLead.googlePlaceId,
        }
      : null,
  );
  const [client, setClient] = useState(initialLead?.clientName ?? "");
  // From a lead, the project name travels as-is — it's the same field the
  // lead carries, not a second auto-built name (B3).
  const [label, setLabel] = useState(
    initialLead
      ? initialLead.name ||
          `${initialLead.propertyName || initialLead.address} – Full Exterior Repaint`
      : "",
  );
  const [size, setSize] = useState<"small" | "large">(
    initialLead ? (initialLead.isLargeJob ? "large" : "small") : "large",
  );

  const known = building?.kind === "known" ? (building as KnownBuilding & { kind: "known" }) : null;
  const hasSpecs =
    known != null &&
    (known.sqftNonfloor != null ||
      known.breezewayCount != null ||
      known.stairSystemCount != null);

  function lock(b: FinderBuilding) {
    setBuilding(b);
    if (b.kind === "known") {
      setClient(b.managementName ?? "");
      setLabel(`${b.name ?? b.address ?? "Property"} – Full Exterior Repaint`);
    } else {
      setClient("");
      setLabel(`${buildingName(b)} – Full Exterior Repaint`);
    }
    setSize("large");
  }
  function backToFinder() {
    setBuilding(null);
    setClient("");
    setLabel("");
  }

  const title = useMemo(() => {
    if (!building) return null;
    if (initialLead) return "Straight from the lead.";
    if (known && hasSpecs) return "You've done the legwork here already.";
    if (known) return "Mercer already has this one.";
    return "New building. Let's price it.";
  }, [building, initialLead, known, hasSpecs]);

  const sub = useMemo(() => {
    if (!building) return null;
    const name = buildingName(building);
    if (initialLead)
      return "The building came over with the lead. Confirm the project, then let the quote draft itself.";
    if (known && hasSpecs)
      return `The client, the contact, and the last takeoff came with ${name}. Confirm the project, then let the quote draft itself from what's on file.`;
    if (known)
      return "The building and the client are on file. Confirm the project and hand it to the quote engine to price.";
    return "The building's pinned. Set the project, then the AI drafts the first quote straight from your site photos.";
  }, [building, initialLead, known, hasSpecs]);

  /* ═══════════ 8a — FINDER ═══════════ */
  if (!building) {
    return (
      <div className="relative mx-auto w-full max-w-[860px] px-6 pb-28 pt-7">
        <header className="mb-5">
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            New opportunity
            <span className="size-[5px] rounded-full bg-muted-foreground/40" />
            the on-ramp to your quote
          </p>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Which building are we quoting?
          </h1>
          <p className="mt-1.5 max-w-[580px] text-sm text-muted-foreground">
            Type a name or an address — same finder as a new lead. If
            you&apos;ve quoted it before, Mercer already has the client, the
            specs, and the takeoff, so the quote can draft itself.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="pt-4">
          <div className="mb-5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <MapPin className="size-3.5 text-muted-foreground/70" />
              Start with the property — the opportunity, the quote, and the money all
              hang off it
            </span>
          </div>

          <PropertyFinder flavor="bid" recentWhenEmpty onLock={lock} />

          <div className="mt-[18px] flex items-start gap-2.5 rounded-[13px] border border-dashed bg-muted/20 p-[13px_16px]">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <CornerDownRight className="size-[15px]" />
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              <b className="font-semibold text-foreground/80">
                Came in from a lead?
              </b>{" "}
              Opening New Opportunity from a pipeline card carries the building with it
              — Mercer skips this search and drops you straight on{" "}
              <b className="font-semibold text-foreground/80">
                Confirm &amp; launch
              </b>
              .
            </p>
          </div>

          <GhostSteps
            steps={[
              { n: "1", t: "The project", w: [150, 150] },
              { n: "2", t: "What we already know", w: [90, 90, 90, 110] },
              { n: "★", t: "Draft the quote with AI", w: [230] },
            ]}
          />
        </div>
      </div>
    );
  }

  /* ═══════════ 8b — CONFIRM & LAUNCH ═══════════ */
  const sizeMeta = SIZES[size];
  return (
    <div className="relative mx-auto w-full max-w-[860px] px-6 pb-28 pt-7">
      <header className="mb-5">
        <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
          New opportunity
          <span className="size-[5px] rounded-full bg-muted-foreground/40" />
          confirm &amp; launch
        </p>
        <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        <p className="mt-1.5 max-w-[580px] text-sm text-muted-foreground">
          {sub}
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={createBidAction} className="flex flex-col">
        {/* hidden payload */}
        <input
          type="hidden"
          name="propertyName"
          value={buildingName(building)}
        />
        <input
          type="hidden"
          name="address"
          value={buildingAddress(building) || "—"}
        />
        <input type="hidden" name="notes" value="" />
        {known && <input type="hidden" name="propertyId" value={known.id} />}
        {known?.primaryContactId && (
          <input
            type="hidden"
            name="contactId"
            value={known.primaryContactId}
          />
        )}
        {building.kind === "place" && (
          <>
            {building.lat != null && (
              <input type="hidden" name="latitude" value={building.lat} />
            )}
            {building.lng != null && (
              <input type="hidden" name="longitude" value={building.lng} />
            )}
            {building.placeId && (
              <input
                type="hidden"
                name="googlePlaceId"
                value={building.placeId}
              />
            )}
          </>
        )}
        {initialLead && (
          <>
            <input type="hidden" name="leadId" value={initialLead.id} />
            {initialLead.propertyId && (
              <input
                type="hidden"
                name="propertyId"
                value={initialLead.propertyId}
              />
            )}
          </>
        )}
        <input type="hidden" name="size" value={size} />

        <AerialBuildingCard
          building={building}
          onBack={backToFinder}
          banner={
            initialLead ? (
              <div className="flex items-center gap-3 border-t border-amber-500/25 bg-amber-500/10 px-5 py-3">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-amber-500 text-white">
                  <GitBranch className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-amber-900 dark:text-amber-200">
                    Started from a lead
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-amber-800/80 dark:text-amber-300/80">
                    Creating this opportunity moves the lead to quoted — the pipeline
                    stays honest.
                  </span>
                </span>
              </div>
            ) : known && known.liveBidId ? (
              <div className="flex items-center gap-3 border-t border-blue-600/25 bg-blue-600/10 px-5 py-3">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-blue-600 text-white">
                  <Send className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-blue-900 dark:text-blue-200">
                    A quote is already out
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-blue-800/80 dark:text-blue-300/80">
                    {known.liveBidLabel} — a new opportunity is a separate scope, not a                    revision.
                  </span>
                </span>
                <a
                  href={`/opportunities/${known.liveBidId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[12.5px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
                >
                  Open that quote
                </a>
              </div>
            ) : known && known.jobs > 0 ? (
              <div className="flex items-center gap-3 border-t border-emerald-600/25 bg-emerald-600/10 px-5 py-3">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-emerald-600 text-white">
                  <BadgeCheck className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-emerald-800 dark:text-emerald-300">
                    You&apos;ve won work here
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-emerald-700/90 dark:text-emerald-400/90">
                    {known.lastWonAt
                      ? `Last won ${monthYear(known.lastWonAt)} · `
                      : ""}
                    <span className="font-mono tabular-nums">
                      {known.jobs} job{known.jobs === 1 ? "" : "s"}
                    </span>{" "}
                    ·{" "}
                    <span className="font-mono tabular-nums">
                      {moneyK(known.lifetime)}
                    </span>{" "}
                    lifetime
                  </span>
                </span>
                <a
                  href={`/properties/${known.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[12.5px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
                >
                  View history
                </a>
              </div>
            ) : known ? (
              <div className="flex items-center gap-3 border-t bg-muted/20 px-5 py-3">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-muted text-foreground/60">
                  <Building2 className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-foreground/80">
                    Known building
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                    The property record is attached — the first opportunity here starts
                    the money story.
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 border-t bg-muted/20 px-5 py-3">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-muted text-foreground/60">
                  <Sparkles className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-foreground/80">
                    New to Mercer
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                    We&apos;ll create the property record when you create the
                    opportunity — no duplicate.
                  </span>
                </span>
              </div>
            )
          }
          facts={
            known ? (
              <>
                {known.managementName && (
                  <Fact icon={<Briefcase className="size-[13px]" />}>
                    {known.managementName}
                  </Fact>
                )}
                {known.lastWonAt && (
                  <Fact icon={<RotateCcw className="size-[13px]" />}>
                    Last painted{" "}
                    <b className="font-mono font-medium">
                      {monthYear(known.lastWonAt)}
                    </b>
                  </Fact>
                )}
                {known.photoCount > 0 && (
                  <Fact icon={<Satellite className="size-[13px]" />}>
                    <b className="font-mono font-medium">{known.photoCount}</b>{" "}
                    photos on file
                  </Fact>
                )}
              </>
            ) : (
              <>
                <Fact icon={<MapPin className="size-[13px]" />}>
                  {buildingAddress(building) || "Address pending"}
                </Fact>
                <Fact icon={<Building2 className="size-[13px]" />}>
                  Units —{" "}
                  <span className="text-muted-foreground/70">
                    add on takeoff
                  </span>
                </Fact>
              </>
            )
          }
        />

        {/* ── band 1: the project ── */}
        <Band
          num="1"
          title="The project"
          note={
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <Pencil className="size-[13px]" />
              Confirm the basics
            </span>
          }
        >
          <FieldLabel>Client</FieldLabel>
          <div className="flex h-[46px] items-center gap-2.5 rounded-[11px] border bg-card px-3.5 transition-[border-color,box-shadow] focus-within:border-foreground/35 focus-within:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]">
            <Briefcase className="size-4 shrink-0 text-muted-foreground" />
            <input
              name="clientName"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              required
              placeholder="Management company or owner…"
              autoComplete="off"
              className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          {known && client ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground/80">
              <Sparkles className="mt-px size-[13px] shrink-0 text-emerald-600" />
              <span>
                Pulled{" "}
                <b className="font-semibold">from the property record</b>
                {known.primaryContactName
                  ? ` — ${known.primaryContactName} rides along on the quote.`
                  : "."}
              </span>
            </p>
          ) : (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-px size-[13px] shrink-0" />
              New client — we&apos;ll save it to the property record when the
              opportunity is created.
            </p>
          )}

          <FieldLabel className="mt-[18px]">Project name</FieldLabel>
          <div className="flex h-[46px] items-center gap-2.5 rounded-[11px] border bg-card px-3.5 transition-[border-color,box-shadow] focus-within:border-foreground/35 focus-within:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]">
            <Tag className="size-4 shrink-0 text-muted-foreground" />
            <input
              name="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Name this project…"
              autoComplete="off"
              className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <FieldLabel className="mt-[18px]">
            Job size{" "}
            <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
              — sets the billing plan &amp; templates. You can change it later.
            </span>
          </FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(SIZES) as Array<keyof typeof SIZES>).map((k) => {
              const meta = SIZES[k];
              const sel = size === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSize(k)}
                  className={cn(
                    "flex items-start gap-3 rounded-[13px] border p-[15px_16px] text-left transition-[border-color,background-color,box-shadow,transform] active:translate-y-px",
                    sel
                      ? "border-foreground bg-muted/20 shadow-[inset_0_0_0_1px] shadow-foreground"
                      : "bg-card hover:border-foreground/25 hover:bg-muted/20",
                  )}
                >
                  <span
                    className={cn(
                      "relative mt-0.5 size-[19px] shrink-0 rounded-full border-2 transition-colors",
                      sel
                        ? "border-foreground after:absolute after:inset-[3px] after:rounded-full after:bg-foreground"
                        : "border-muted-foreground/50",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                      <meta.Icon
                        className={cn(
                          "size-4",
                          sel ? "text-foreground" : "text-muted-foreground",
                        )}
                      />
                      {meta.title}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                        <Clock className="size-[13px] text-muted-foreground/70" />
                        {meta.dur}
                      </span>
                      <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                        <Receipt className="size-[13px] text-muted-foreground/70" />
                        {meta.bill}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Band>

        {/* ── band 2: what we already know ── */}
        {known && hasSpecs && (
          <Band
            num="2"
            title="What we already know"
            note={
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="size-[13px]" />
                Reuses your takeoff
              </span>
            }
          >
            <p className="mb-3.5 text-[13.5px] leading-relaxed text-foreground/80">
              Pulled straight from the property record for{" "}
              <b className="font-semibold">{known.name}</b>. The AI draft
              starts from these numbers
              {known.photoCount > 0
                ? ` and the ${known.photoCount} photos on file`
                : ""}{" "}
              — <b className="font-semibold">you&apos;re not re-measuring a
              thing.</b>
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-2.5">
              {known.sqftNonfloor != null && (
                <Spec
                  icon={<Ruler className="size-4" />}
                  label="Paintable area"
                  value={Math.round(known.sqftNonfloor).toLocaleString()}
                  unit="sqft"
                />
              )}
              {known.breezewayCount != null && (
                <Spec
                  icon={<Wind className="size-4" />}
                  label="Breezeways"
                  value={String(known.breezewayCount)}
                  unit="open-air"
                />
              )}
              {known.stairSystemCount != null && (
                <Spec
                  icon={<ChevronsUp className="size-4" />}
                  label="Stair systems"
                  value={String(known.stairSystemCount)}
                  unit="systems"
                />
              )}
            </div>
            <p className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Satellite className="size-3.5 shrink-0 text-muted-foreground/70" />
              EagleView aerial measurement will verify these here too —{" "}
              <span className="text-muted-foreground/70">coming soon</span>.
            </p>
          </Band>
        )}

        {/* ── launchpad ── */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <div className="flex items-baseline gap-3 border-b border-border/60 bg-muted/20 px-5 py-3.5">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              This opportunity
            </span>
            <span className="min-w-0 truncate text-[13px] text-foreground/80">
              <b className="font-semibold text-foreground">
                {buildingName(building)}
              </b>
              <span className="px-1.5 text-border">·</span>
              {client || (
                <span className="text-muted-foreground/70">add a client</span>
              )}
              <span className="px-1.5 text-border">·</span>
              {sizeMeta.title.toLowerCase()} · {sizeMeta.bill.toLowerCase()}
            </span>
          </div>
          <div className="p-5">
            <LaunchButtons
              helper={
                <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <WandSparkles className="size-3.5 shrink-0 text-muted-foreground/70" />
                  {known && hasSpecs ? (
                    <span>
                      Opens the quote engine with the specs
                      {known.photoCount > 0
                        ? ` and ${known.photoCount} photos`
                        : ""}{" "}
                      on file loaded — describe the scope and it prices.
                    </span>
                  ) : known ? (
                    <span>
                      Opens the quote engine with the property record attached
                      — add photos and the AI prices them.
                    </span>
                  ) : (
                    <span>
                      Opens the quote engine — add scope and photos, the AI
                      prices them in ~60s.
                    </span>
                  )}
                </p>
              }
            />
          </div>
        </div>
      </form>
    </div>
  );
}

/**
 * Launchpad that goes dead once clicked — the create action takes a few
 * seconds, and live buttons during that window minted duplicate bids
 * (Jordan A1, same failure as the lead form).
 */
function LaunchButtons({ helper }: { helper: React.ReactNode }) {
  const { pending } = useFormStatus();
  const [clicked, setClicked] = useState<"draft" | "empty" | null>(null);

  return (
    <>
      <button
        type="submit"
        name="next"
        value="draft"
        disabled={pending}
        onClick={() => setClicked("draft")}
        className="flex w-full items-center gap-4 rounded-[14px] border-none bg-foreground p-[16px_18px] text-left text-background shadow-[0_10px_26px_-12px_rgb(24_24_27/0.55)] transition-[background-color,transform,box-shadow] hover:opacity-95 hover:shadow-[0_14px_32px_-12px_rgb(24_24_27/0.62)] active:translate-y-px disabled:pointer-events-none disabled:opacity-70"
      >
        <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-background/15">
          {pending && clicked !== "empty" ? (
            <Loader2 className="size-[21px] animate-spin" />
          ) : (
            <Sparkles className="size-[21px]" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-semibold tracking-tight">
            {pending && clicked !== "empty"
              ? "Creating…"
              : "Create & draft quote with AI"}
          </span>
          <span className="font-mono text-[12.5px] text-background/65">
            Scope + photos → priced lines in ~60s
          </span>
        </span>
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-background/10 transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="size-[17px]" />
        </span>
      </button>
      {helper}
      <div className="mt-4 flex items-center gap-2.5 border-t border-border/60 pt-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          or
        </span>
        <button
          type="submit"
          name="next"
          value="empty"
          disabled={pending}
          onClick={() => setClicked("empty")}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
        >
          {pending && clicked === "empty" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FilePlus className="size-3.5" />
          )}
          Create an empty opportunity — I&apos;ll price it by hand
        </button>
      </div>
    </>
  );
}

function Band({
  num,
  title,
  note,
  children,
}: {
  num: string;
  title: string;
  note: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-center gap-3 px-[18px] pt-[15px]">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-foreground font-mono text-xs text-background">
          {num}
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          {title}
        </span>
        <span className="ml-auto">{note}</span>
      </div>
      <div className="p-[14px_18px_18px]">{children}</div>
    </div>
  );
}

function FieldLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Spec({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-[12px_13px]">
      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] border bg-card text-foreground/70">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-sm font-medium tabular-nums tracking-tight">
          {value}
          <span className="ml-1.5 font-sans text-[11px] font-normal text-muted-foreground/70">
            {unit}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 self-start rounded-full border border-emerald-600/25 bg-emerald-600/10 px-1.5 py-px text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-400">
          <RotateCcw className="size-2.5" />
          reuses takeoff
        </span>
      </span>
    </div>
  );
}
