"use client";

import { useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarPlus,
  Check,
  ChevronDown,
  Gavel,
  Hand,
  MapPin,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { createLeadAction } from "@/lib/actions";
import type { ContactRegisterRow, KnownBuilding } from "@/lib/store";
import {
  AerialBuildingCard,
  Fact,
  GhostSteps,
  PropertyFinder,
  buildingAddress,
  buildingName,
  moneyK,
  monthYear,
  repaintDue,
  type FinderBuilding,
} from "@/components/property-finder";
import { cn } from "@/lib/utils";

const AVATAR_TINTS = [
  "bg-blue-600",
  "bg-rose-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-cyan-600",
];
function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
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

const SCOPE = [
  "Full exterior",
  "Breezeways",
  "Stairs",
  "Wood rot",
  "Interior common",
];
const DEFAULT_SOURCES = [
  "Repeat client",
  "Referral",
  "RFP / bid invite",
  "Website",
  "Walk-up",
  "Cold outreach",
];

export function NewLeadIntake({
  contacts,
  sources,
  error,
}: {
  contacts: ContactRegisterRow[];
  sources: string[];
  error: string | null;
}) {
  const [building, setBuilding] = useState<FinderBuilding | null>(null);

  /* band state */
  const [contactId, setContactId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [acOpen, setAcOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [scope, setScope] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<string | null>(null);
  const [customSource, setCustomSource] = useState(false);
  const [largeJob, setLargeJob] = useState(false);
  const [rough, setRough] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const isKnown = building?.kind === "known";
  const knownB = isKnown
    ? (building as { kind: "known" } & KnownBuilding)
    : null;
  const due = knownB != null && repaintDue(knownB);

  function lock(b: FinderBuilding) {
    setBuilding(b);
    if (b.kind === "known") {
      if (b.primaryContactId) setContactId(b.primaryContactId);
      if (b.managementName) setCompany(b.managementName);
      setSource("Repeat client");
      if (repaintDue(b)) setScope(new Set(["Full exterior"]));
    }
  }
  function backToFinder() {
    setBuilding(null);
    setContactId(null);
    setNewContact(false);
    setCompany("");
    setScope(new Set());
    setSource(null);
    setLargeJob(false);
  }

  const pickedContact = useMemo(
    () => contacts.find((c) => c.id === contactId) ?? null,
    [contacts, contactId],
  );
  const filteredContacts = useMemo(() => {
    const ts = contactQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (ts.length === 0) return contacts.slice(0, 6);
    return contacts
      .filter((c) => {
        const hay =
          `${c.name} ${c.company ?? ""} ${c.title ?? ""}`.toLowerCase();
        return ts.every((t) => hay.includes(t));
      })
      .slice(0, 6);
  }, [contacts, contactQuery]);

  const name = building ? buildingName(building) : "";
  const address = building ? buildingAddress(building) : "";
  const leadName = `${name || "New property"} – ${
    [...scope][0] ?? "Exterior repaint"
  }`;
  const allSources = useMemo(() => {
    const merged = [...sources, ...DEFAULT_SOURCES];
    return [...new Set(merged)].slice(0, 7);
  }, [sources]);

  /* ═══════════ 7a — FINDER ═══════════ */
  if (!building) {
    return (
      <div className="relative mx-auto w-full max-w-[860px] px-6 pb-28 pt-7">
        <header className="mb-5">
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            New lead
            <span className="size-[5px] rounded-full bg-muted-foreground/40" />
            the front door
          </p>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Find the building.
          </h1>
          <p className="mt-1.5 max-w-[560px] text-sm text-muted-foreground">
            Type a name or an address. If we&apos;ve painted it before, Mercer
            already knows the owner, the contact, and the history — you
            won&apos;t type any of it twice.
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
              Start with the property — everything else hangs off it
            </span>
          </div>

          <PropertyFinder flavor="lead" onLock={lock} />

          <GhostSteps
            steps={[
              { n: "A", t: "Who", w: [150, 150] },
              { n: "B", t: "What", w: [110, 90, 90, 120] },
              { n: "C", t: "Send-off", w: [220] },
            ]}
          />
        </div>
      </div>
    );
  }

  /* ═══════════ 7b — BUILDING LOCKED ═══════════ */
  return (
    <div className="relative mx-auto w-full max-w-[860px] px-6 pb-28 pt-7">
      <header className="mb-5">
        <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
          New lead
          <span className="size-[5px] rounded-full bg-muted-foreground/40" />
          the front door
        </p>
        <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
          {isKnown
            ? "Mercer already knows this one."
            : "One building, twenty seconds."}
        </h1>
        <p className="mt-1.5 max-w-[560px] text-sm text-muted-foreground">
          {isKnown
            ? `You painted ${name} before. The owner, the contact, and the history came with it — confirm the scope and the lead is in.`
            : "The building's pinned. Add who it's for and what the work is — that's the whole lead."}
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={createLeadAction} className="flex flex-col">
        {/* hidden payload */}
        <input type="hidden" name="name" value={leadName} />
        <input type="hidden" name="propertyName" value={name} />
        <input type="hidden" name="resolvedAddress" value={address} />
        {isKnown && knownB && (
          <input type="hidden" name="propertyId" value={knownB.id} />
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
        {pickedContact && (
          <input type="hidden" name="contactId" value={pickedContact.id} />
        )}
        <input type="hidden" name="company" value={company} />
        <input
          type="hidden"
          name="scopeCategory"
          value={[...scope].join(", ")}
        />
        <input type="hidden" name="sourceTag" value={source ?? ""} />
        <input type="hidden" name="estValue" value={rough} />
        {largeJob && <input type="hidden" name="isLargeJob" value="on" />}

        <AerialBuildingCard
          building={building}
          onBack={backToFinder}
          banner={
            isKnown && knownB ? (
              <div className="flex items-center gap-3 border-t border-emerald-600/25 bg-emerald-600/10 px-5 py-3">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-emerald-600 text-white">
                  <BadgeCheck className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Mercer knows this building
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-emerald-700/90 dark:text-emerald-400/90">
                    {knownB.lastWonAt
                      ? `Painted ${monthYear(knownB.lastWonAt)} · `
                      : ""}
                    <span className="font-mono tabular-nums">
                      {knownB.jobs} job{knownB.jobs === 1 ? "" : "s"}
                    </span>{" "}
                    ·{" "}
                    <span className="font-mono tabular-nums">
                      {moneyK(knownB.lifetime)}
                    </span>{" "}
                    lifetime
                  </span>
                </span>
                <a
                  href={`/properties/${knownB.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[12.5px] font-medium text-blue-700 hover:underline dark:text-blue-400"
                >
                  View history
                </a>
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
                    We&apos;ll create the property record when you add the lead
                    — no duplicate.
                  </span>
                </span>
              </div>
            )
          }
          facts={
            isKnown && knownB ? (
              <>
                {knownB.managementName && (
                  <Fact icon={<Briefcase className="size-[13px]" />}>
                    {knownB.managementName}
                  </Fact>
                )}
                {knownB.lastWonAt && (
                  <Fact icon={<RotateCcw className="size-[13px]" />}>
                    Last painted{" "}
                    <b className="font-mono font-medium">
                      {monthYear(knownB.lastWonAt)}
                    </b>
                  </Fact>
                )}
                {due && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
                    <RotateCcw className="size-3" />
                    Repaint due
                  </span>
                )}
              </>
            ) : (
              <>
                <Fact icon={<MapPin className="size-[13px]" />}>
                  {address || "Address pending"}
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

        {/* ── band 1: who ── */}
        <Band
          num="1"
          title="Who's it for?"
          note={
            pickedContact ? (
              <BandNote done icon={<Check className="size-[13px]" />}>
                {isKnown ? "Auto-attached" : "On file"}
              </BandNote>
            ) : (
              <BandNote icon={<UserRound className="size-[13px]" />}>
                Pick or add a person
              </BandNote>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Contact</FieldLabel>
              {pickedContact ? (
                <div className="relative">
                  <div className="flex items-center gap-3 rounded-[11px] border bg-muted/20 p-[9px_11px]">
                    <span
                      className={cn(
                        "grid size-[38px] shrink-0 place-items-center rounded-full text-[13px] font-bold text-white",
                        tintFor(pickedContact.name),
                      )}
                    >
                      {initials(pickedContact.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14.5px] font-semibold tracking-tight">
                          {pickedContact.name}
                        </span>
                        {pickedContact.isDecisionMaker && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground px-2 py-px text-[10.5px] font-semibold text-background">
                            <Gavel className="size-[11px]" />
                            Decision maker
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
                        {pickedContact.company && (
                          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border bg-muted/60 px-2 py-px text-[11.5px] text-foreground/80">
                            <Briefcase className="size-[11px] text-muted-foreground/70" />
                            {pickedContact.company}
                          </span>
                        )}
                        <span className="font-mono tabular-nums text-foreground/70">
                          {pickedContact.dealsCount} deal
                          {pickedContact.dealsCount === 1 ? "" : "s"}
                        </span>
                        <span className="text-border">·</span>
                        <span className="font-mono tabular-nums text-foreground/70">
                          {moneyK(pickedContact.lifetime)}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Clear contact"
                      onClick={() => {
                        setContactId(null);
                        setAcOpen(false);
                      }}
                      className="grid size-[30px] shrink-0 place-items-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-[15px]" />
                    </button>
                  </div>
                  {isKnown && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="mt-px size-[13px] shrink-0 text-emerald-600" />
                      Came attached to {name} — their name is on its history.
                    </p>
                  )}
                </div>
              ) : newContact ? (
                <div className="flex flex-col gap-2">
                  <SlimField>
                    <UserRound className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      name="contactName"
                      placeholder="Their name"
                      className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                  </SlimField>
                  <div className="grid grid-cols-2 gap-2">
                    <SlimField>
                      <input
                        name="phone"
                        type="tel"
                        placeholder="Phone"
                        className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      />
                    </SlimField>
                    <SlimField>
                      <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      />
                    </SlimField>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewContact(false)}
                    className="self-start text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    ← Search existing instead
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <SlimField>
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      value={contactQuery}
                      onChange={(e) => {
                        setContactQuery(e.target.value);
                        setAcOpen(true);
                      }}
                      onFocus={() => setAcOpen(true)}
                      placeholder="Search people or type a name…"
                      autoComplete="off"
                      className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                    <ChevronDown className="size-[15px] shrink-0 text-muted-foreground/60" />
                  </SlimField>
                  {acOpen && (
                    <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[14px] border bg-card shadow-[0_18px_44px_-14px_rgb(0_0_0/0.26)]">
                      <p className="px-3.5 pb-1.5 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                        Existing contacts
                      </p>
                      {filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setContactId(c.id);
                            if (!company && c.company) setCompany(c.company);
                            setAcOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-muted/40"
                        >
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-full text-[11.5px] font-bold text-white",
                              tintFor(c.name),
                            )}
                          >
                            {initials(c.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold">
                              {c.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[c.title, c.company]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted-foreground/70">
                            {c.dealsCount} deal{c.dealsCount === 1 ? "" : "s"}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setNewContact(true);
                          setAcOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 border-t border-border/60 bg-muted/20 px-3.5 py-2.5 text-left text-[13px] font-medium text-foreground/80 transition-colors hover:bg-muted/40"
                      >
                        <UserPlus className="size-[15px] text-muted-foreground" />
                        New contact instead
                      </button>
                    </div>
                  )}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setNewContact(true)}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-[13px]" />
                      New contact — name, phone, email inline
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Company</FieldLabel>
              <SlimField>
                <Briefcase className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Management company…"
                  autoComplete="off"
                  className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
              </SlimField>
            </div>
          </div>
        </Band>

        {/* ── band 2: what ── */}
        <Band
          num="2"
          title="What's the work?"
          note={
            scope.size > 0 ? (
              <BandNote done icon={<Check className="size-[13px]" />}>
                {scope.size} in scope
              </BandNote>
            ) : (
              <BandNote icon={<Hand className="size-[13px]" />}>
                Tap the scope
              </BandNote>
            )
          }
        >
          <FieldLabel>Scope</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {SCOPE.map((s) => {
              const sel = scope.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setScope((prev) => {
                      const next = new Set(prev);
                      if (next.has(s)) next.delete(s);
                      else next.add(s);
                      return next;
                    })
                  }
                  className={cn(
                    "inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border px-3.5 text-[13.5px] font-medium transition-colors active:translate-y-px",
                    sel
                      ? "border-foreground bg-foreground text-background"
                      : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
                  )}
                >
                  {sel && <Check className="size-[15px]" />}
                  {s}
                </button>
              );
            })}
          </div>

          <div className="mt-[18px] flex flex-wrap items-end gap-6">
            <div>
              <FieldLabel>
                Rough ${" "}
                <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                  — gut number, refine on takeoff
                </span>
              </FieldLabel>
              <div className="flex h-[46px] w-[210px] items-center gap-1 rounded-[11px] border bg-card px-3.5 transition-[border-color,box-shadow] focus-within:border-foreground/35 focus-within:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]">
                <span className="font-mono text-base text-muted-foreground">
                  $
                </span>
                <input
                  value={rough}
                  onChange={(e) =>
                    setRough(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  inputMode="numeric"
                  placeholder="0"
                  className="min-w-0 flex-1 border-none bg-transparent font-mono text-base font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>Job size</FieldLabel>
              <button
                type="button"
                onClick={() => setLargeJob((v) => !v)}
                className="inline-flex items-center gap-2.5 text-left"
              >
                <span
                  className={cn(
                    "relative h-[23px] w-10 shrink-0 rounded-full transition-colors after:absolute after:left-[2.5px] after:top-[2.5px] after:size-[18px] after:rounded-full after:bg-white after:shadow after:transition-transform",
                    largeJob
                      ? "bg-foreground after:translate-x-[17px]"
                      : "bg-muted-foreground/40",
                  )}
                />
                <span className="text-[13.5px] font-medium text-foreground/80">
                  <b className="font-semibold text-foreground">Large job</b>{" "}
                  <span className="text-xs text-muted-foreground/80">
                    ≥ 2 weeks · drives templates
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div className="mt-5">
            <FieldLabel>Where&apos;d it come from?</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {allSources.map((s) => {
                const sel = source === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(sel ? null : s)}
                    className={cn(
                      "inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border px-3.5 text-[13.5px] font-medium transition-colors active:translate-y-px",
                      sel
                        ? "border-foreground bg-foreground text-background"
                        : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
                    )}
                  >
                    {sel && <Check className="size-[15px]" />}
                    {s}
                  </button>
                );
              })}
              {customSource ? (
                <input
                  autoFocus
                  defaultValue=""
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) setSource(v);
                    setCustomSource(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="Source…"
                  className="h-[38px] w-36 rounded-[10px] border bg-card px-3 text-[13.5px] outline-none focus:border-foreground/35"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomSource(true)}
                  className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-dashed bg-card px-3.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  Other
                </button>
              )}
              {source && !allSources.includes(source) && (
                <span className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-foreground bg-foreground px-3.5 text-[13.5px] font-medium text-background">
                  <Check className="size-[15px]" />
                  {source}
                </span>
              )}
            </div>
          </div>
        </Band>

        {/* ── band 3: notes & files ── */}
        <Band num="3" title="Notes & files" note={<BandNote>Optional</BandNote>}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border-[1.5px] border-dashed bg-muted/20 p-[14px_16px] text-left transition-colors hover:border-foreground/25 hover:bg-muted/30"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-muted text-foreground/60">
              <Paperclip className="size-[17px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-foreground/80">
                {fileNames.length > 0
                  ? fileNames.join(", ")
                  : "Drop the RFP, paint spec, or referral email — they ride along"}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground/80">
                PDF, images, or forward the email. Attached to the lead from
                day one.
              </span>
            </span>
            <span className="shrink-0 text-[12.5px] font-medium text-blue-700 dark:text-blue-400">
              Browse
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            name="attachments"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.eml,.msg,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*,application/pdf"
            className="hidden"
            onChange={(e) =>
              setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))
            }
          />
          <textarea
            name="notes"
            rows={2}
            placeholder="Anything worth remembering — access notes, who referred it, the deadline…"
            className="mt-3 min-h-14 w-full resize-y rounded-xl border bg-card p-[12px_14px] text-[13.5px] leading-relaxed outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-foreground/35 focus:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]"
          />
        </Band>

        {/* ── send-off ── */}
        <div className="mt-1.5 flex flex-wrap items-center gap-4 border-t pt-[18px]">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              This lead
            </p>
            <p className="truncate text-[13px] text-foreground/80">
              <b className="font-semibold text-foreground">{name}</b>
              <span className="px-1.5 text-border">·</span>
              {pickedContact?.name ?? (
                <span className="text-muted-foreground/70">add a contact</span>
              )}
              <span className="px-1.5 text-border">·</span>
              {scope.size > 0 ? (
                [...scope].join(", ")
              ) : (
                <span className="text-muted-foreground/70">add scope</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="submit"
              name="next"
              value="schedule"
              className="inline-flex h-11 items-center gap-2 rounded-[11px] border bg-card px-5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted active:translate-y-px"
            >
              <CalendarPlus className="size-4" />
              Add &amp; schedule takeoff
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-[11px] border border-foreground bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 active:translate-y-px"
            >
              <Check className="size-4" />
              Add lead
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── little layout helpers ── */

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
      <div className="p-[14px_18px_17px]">{children}</div>
    </div>
  );
}

function BandNote({
  done,
  icon,
  children,
}: {
  done?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        done ? "font-medium text-emerald-600" : "text-muted-foreground/80",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
      {children}
    </p>
  );
}

function SlimField({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[46px] items-center gap-2.5 rounded-[11px] border bg-card px-3.5 transition-[border-color,box-shadow] focus-within:border-foreground/35 focus-within:shadow-[0_0_0_3px_rgb(0_0_0/0.06)]">
      {children}
    </div>
  );
}
