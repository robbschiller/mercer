"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarPlus,
  Check,
  ChevronDown,
  CornerDownLeft,
  Gavel,
  Hand,
  History,
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
import {
  createLeadAction,
  searchKnownPropertiesAction,
} from "@/lib/actions";
import type { ContactRegisterRow, KnownBuilding } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ── shared bits ── */

function moneyK(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "").replace(/\.$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
function monthYear(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
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

const REPAINT_CYCLE_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;
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

type PlacePick = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
};

type Building =
  | ({ kind: "known" } & KnownBuilding)
  | ({ kind: "place" } & PlacePick)
  | { kind: "custom"; text: string };

function mapsKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return k || undefined;
}
function staticAerial(lat: number, lng: number): string | null {
  const key = mapsKey();
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x300&scale=2&maptype=satellite&key=${key}`;
}

/* ── the component ── */

export function NewLeadIntake({
  contacts,
  sources,
  error,
}: {
  contacts: ContactRegisterRow[];
  sources: string[];
  error: string | null;
}) {
  /* finder state */
  const [query, setQuery] = useState("");
  const [known, setKnown] = useState<KnownBuilding[]>([]);
  const [preds, setPreds] = useState<
    { placeId: string; main: string; sub: string }[]
  >([]);
  const [building, setBuilding] = useState<Building | null>(null);
  const [resolving, setResolving] = useState(false);

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

  const finderInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);
  const placesTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const placesReadyRef = useRef(false);

  /* Places bootstrap — same loader the address autocomplete uses. */
  useEffect(() => {
    const key = mapsKey();
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        setOptions({ key, v: "weekly" });
        await importLibrary("places");
        if (cancelled) return;
        placesTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
        placesReadyRef.current = true;
      } catch (e) {
        console.error("[NewLeadIntake] Places load failed:", e);
      }
    })();
    return () => {
      cancelled = true;
      placesReadyRef.current = false;
    };
  }, []);

  useEffect(() => {
    finderInputRef.current?.focus();
  }, [building]);

  /* merged search: known buildings (server) + Places (client) */
  const runSearch = useCallback(async (q: string) => {
    const seq = ++seqRef.current;
    const term = q.trim();
    if (term.length < 2) {
      setKnown([]);
      setPreds([]);
      return;
    }
    const [knownRes, placeRes] = await Promise.all([
      searchKnownPropertiesAction(term).catch(() => [] as KnownBuilding[]),
      (async () => {
        if (!placesReadyRef.current || !placesTokenRef.current) return [];
        try {
          const { suggestions } =
            await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
              { input: term, sessionToken: placesTokenRef.current },
            );
          return suggestions
            .map((s) => s.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => p != null)
            .slice(0, 4)
            .map((p) => ({
              placeId: p.placeId ?? "",
              main: p.mainText?.text ?? p.text.text,
              sub: p.secondaryText?.text ?? "",
              pred: p,
            }));
        } catch {
          return [];
        }
      })(),
    ]);
    if (seq !== seqRef.current) return;
    setKnown(knownRes);
    setPreds(placeRes as typeof preds);
    predsRef.current = placeRes as never;
  }, []);

  const predsRef = useRef<
    ({ placeId: string; main: string; sub: string } & {
      pred?: google.maps.places.PlacePrediction;
    })[]
  >([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onQueryChange(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(v), 220);
  }

  /* picks */
  function pickKnown(b: KnownBuilding) {
    setBuilding({ kind: "known", ...b });
    if (b.primaryContactId) setContactId(b.primaryContactId);
    if (b.managementName) setCompany(b.managementName);
    const due =
      b.lastWonAt != null &&
      Date.now() - new Date(b.lastWonAt).getTime() > REPAINT_CYCLE_MS;
    setSource("Repeat client");
    if (due) setScope(new Set(["Full exterior"]));
  }
  async function pickPlace(i: number) {
    const entry = predsRef.current[i];
    if (!entry) return;
    setResolving(true);
    try {
      let pick: PlacePick = {
        name: entry.main,
        address: entry.sub || entry.main,
        lat: null,
        lng: null,
        placeId: entry.placeId || null,
      };
      if (entry.pred) {
        const place = entry.pred.toPlace();
        await place.fetchFields({
          fields: ["formattedAddress", "location", "id", "displayName"],
        });
        const raw = place.displayName as unknown;
        const display =
          typeof raw === "string"
            ? raw
            : ((raw as { text?: string } | null)?.text ?? null);
        pick = {
          name: display || entry.main,
          address: place.formattedAddress ?? pick.address,
          lat: place.location ? place.location.lat() : null,
          lng: place.location ? place.location.lng() : null,
          placeId: place.id ?? pick.placeId,
        };
        placesTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
      }
      setBuilding({ kind: "place", ...pick });
    } finally {
      setResolving(false);
    }
  }
  function pickCustom() {
    const text = query.trim();
    if (!text) return;
    setBuilding({ kind: "custom", text });
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

  const isKnown = building?.kind === "known";
  const knownB = isKnown ? (building as { kind: "known" } & KnownBuilding) : null;
  const repaintDue =
    knownB?.lastWonAt != null &&
    Date.now() - new Date(knownB.lastWonAt).getTime() > REPAINT_CYCLE_MS;

  const buildingName =
    building?.kind === "custom"
      ? building.text
      : (building?.name ?? building?.address ?? "");
  const buildingAddress =
    building == null
      ? ""
      : building.kind === "custom"
        ? building.text
        : (building.address ?? "");
  const aerialUrl = (() => {
    if (!building) return null;
    if (building.kind === "known") {
      if (building.satelliteImageUrl) return building.satelliteImageUrl;
      if (building.latitude != null && building.longitude != null)
        return staticAerial(building.latitude, building.longitude);
      return null;
    }
    if (building.kind === "place" && building.lat != null && building.lng != null)
      return staticAerial(building.lat, building.lng);
    return null;
  })();

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

  const leadName = `${buildingName || "New property"} – ${
    [...scope][0] ?? "Exterior repaint"
  }`;
  const allSources = useMemo(() => {
    const merged = [...sources, ...DEFAULT_SOURCES];
    return [...new Set(merged)].slice(0, 7);
  }, [sources]);

  /* ═══════════ 7a — FINDER ═══════════ */
  if (!building) {
    const hasQuery = query.trim().length >= 2;
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

          <div className="relative">
            <div className="flex h-[68px] items-center gap-3.5 rounded-full border-[1.5px] bg-card pl-[22px] pr-3.5 shadow-[0_2px_4px_rgb(0_0_0/0.04),0_8px_30px_-14px_rgb(0_0_0/0.18)] transition-[border-color,box-shadow] focus-within:border-foreground/40 focus-within:shadow-[0_2px_4px_rgb(0_0_0/0.04),0_0_0_4px_rgb(0_0_0/0.06)]">
              <Search className="size-[22px] shrink-0 text-muted-foreground" />
              <input
                ref={finderInputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (known[0]) pickKnown(known[0]);
                  else if (predsRef.current[0]) void pickPlace(0);
                  else pickCustom();
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="Property name or address…"
                className="min-w-0 flex-1 border-none bg-transparent text-xl font-medium tracking-tight outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => {
                    setQuery("");
                    setKnown([]);
                    setPreds([]);
                    finderInputRef.current?.focus();
                  }}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  <X className="size-[17px]" />
                </button>
              )}
            </div>

            {hasQuery && (known.length > 0 || preds.length > 0 || true) && (
              <div className="mt-3 overflow-hidden rounded-[18px] border bg-card shadow-[0_18px_44px_-14px_rgb(0_0_0/0.26),0_2px_6px_rgb(0_0_0/0.06)]">
                {known.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-[18px] pb-1 pt-3">
                      <History className="size-3.5 text-muted-foreground/70" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                        In Mercer — buildings you&apos;ve worked
                      </span>
                      <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/70">
                        {known.length}
                      </span>
                    </div>
                    {known.map((b, i) => {
                      const due =
                        b.lastWonAt != null &&
                        Date.now() - new Date(b.lastWonAt).getTime() >
                          REPAINT_CYCLE_MS;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => pickKnown(b)}
                          className={cn(
                            "flex w-full items-center gap-3.5 px-[18px] py-3 text-left transition-colors hover:bg-muted/40",
                            i === 0 && "bg-muted/25",
                          )}
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-foreground text-background">
                            <Building2 className="size-[19px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[15px] font-semibold tracking-tight">
                                {b.name ?? b.address}
                              </span>
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/60 px-2 py-px text-[10.5px] font-semibold text-foreground/70">
                                <History className="size-[11px]" />
                                Known
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                              {[b.address, b.managementName]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1.5">
                            <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                              <b className="font-medium text-foreground">
                                {moneyK(b.lifetime)}
                              </b>{" "}
                              · {b.jobs} job{b.jobs === 1 ? "" : "s"}
                            </span>
                            {due && (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-[3px] text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                <RotateCcw className="size-3" />
                                Repaint due
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className={cn(known.length > 0 && "border-t border-border/60")}>
                  <div className="flex items-center gap-2 px-[18px] pb-1 pt-3">
                    <MapPin className="size-3.5 text-muted-foreground/70" />
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                      Maps
                    </span>
                    <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/70">
                      {preds.length}
                    </span>
                  </div>
                  {preds.length > 0 ? (
                    preds.map((p, i) => (
                      <button
                        key={`${p.placeId}-${i}`}
                        type="button"
                        disabled={resolving}
                        onClick={() => void pickPlace(i)}
                        className="flex w-full items-center gap-3.5 px-[18px] py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-muted text-foreground/60">
                          <MapPin className="size-[19px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold tracking-tight">
                            {p.main}
                          </span>
                          <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                            {p.sub}
                          </span>
                        </span>
                        <CornerDownLeft className="size-4 shrink-0 text-muted-foreground/50" />
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={pickCustom}
                      className="flex w-full items-center gap-3.5 px-[18px] py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-muted text-foreground/60">
                        <MapPin className="size-[19px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold tracking-tight">
                          Use &ldquo;{query.trim()}&rdquo;
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                          Drop a pin at this address
                        </span>
                      </span>
                      <CornerDownLeft className="size-4 shrink-0 text-muted-foreground/50" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-[18px] py-2.5 text-xs text-muted-foreground/80">
                  <CornerDownLeft className="size-[13px]" />
                  Picking a known building attaches the existing record — no
                  duplicates.
                </div>
              </div>
            )}
          </div>

          {/* ghost of what comes next */}
          <div
            aria-hidden
            className="pointer-events-none mt-8 select-none opacity-50 [mask-image:linear-gradient(180deg,#000_0%,#000_30%,transparent_96%)]"
          >
            {[
              { n: "A", t: "Who", w: [150, 150] },
              { n: "B", t: "What", w: [110, 90, 90, 120] },
              { n: "C", t: "Send-off", w: [220] },
            ].map((g) => (
              <div
                key={g.n}
                className="mb-3.5 flex items-center gap-3.5 rounded-2xl border bg-card p-[18px_20px]"
              >
                <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-muted font-mono text-[13px] text-muted-foreground/70">
                  {g.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-foreground/80">
                    {g.t}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    {g.w.map((w, i) => (
                      <span
                        key={i}
                        className="block h-[30px] rounded-[9px] bg-muted"
                        style={{ width: w }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            ? `You painted ${buildingName} before. The owner, the contact, and the history came with it — confirm the scope and the lead is in.`
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
        <input type="hidden" name="propertyName" value={buildingName} />
        <input type="hidden" name="resolvedAddress" value={buildingAddress} />
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
        <input type="hidden" name="scopeCategory" value={[...scope].join(", ")} />
        <input type="hidden" name="sourceTag" value={source ?? ""} />
        <input type="hidden" name="estValue" value={rough} />
        {largeJob && <input type="hidden" name="isLargeJob" value="on" />}

        {/* ── building card ── */}
        <div className="mb-4 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <div className="relative h-[288px] overflow-hidden bg-muted">
            {aerialUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={aerialUrl}
                alt="Aerial view"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,rgb(148_163_184/0.25),transparent_60%)] text-muted-foreground/50">
                <span className="text-xs font-medium uppercase tracking-[0.08em]">
                  Aerial pending — resolves on enrichment
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(10_12_20/0.28)_0%,transparent_26%,transparent_48%,rgb(10_12_20/0.62)_100%)]" />
            {/* dropped pin */}
            <span className="pointer-events-none absolute left-1/2 top-[44%] z-[3] -translate-x-1/2 -translate-y-full animate-[pinDrop_.5s_cubic-bezier(.34,1.3,.5,1)_both]">
              <span className="relative block size-7 -rotate-45 rounded-[50%_50%_50%_0] bg-foreground shadow-[0_8px_18px_-4px_rgb(0_0_0/0.55)] dark:bg-background">
                <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background dark:bg-foreground" />
              </span>
            </span>
            <button
              type="button"
              onClick={backToFinder}
              className="absolute left-3.5 top-3.5 z-[4] inline-flex h-8 items-center gap-2 rounded-full bg-black/50 px-3.5 text-[12.5px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/70"
            >
              <span className="font-mono text-[13px]">⌫</span>
              not it? search again
            </button>
            {isKnown && (
              <span className="pointer-events-none absolute right-3.5 top-3.5 z-[3] inline-flex h-[30px] items-center gap-1.5 rounded-full bg-black/50 px-3 text-[11.5px] font-semibold text-white backdrop-blur-md">
                <BadgeCheck className="size-[13px]" />
                In Mercer
              </span>
            )}
            <div className="pointer-events-none absolute inset-x-5 bottom-[18px] z-[3]">
              <p className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.45)]">
                <MapPin className="size-5 opacity-90" />
                {buildingName}
              </p>
              <p className="ml-[29px] mt-1 text-[13.5px] text-white/85 [text-shadow:0_1px_10px_rgb(0_0_0/0.5)]">
                {buildingAddress}
              </p>
            </div>
          </div>

          {isKnown && knownB ? (
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
                  We&apos;ll create the property record when you add the lead —
                  no duplicate.
                </span>
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-5 py-3">
            {isKnown && knownB ? (
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
                {repaintDue && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
                    <RotateCcw className="size-3" />
                    Repaint due
                  </span>
                )}
              </>
            ) : (
              <>
                <Fact icon={<MapPin className="size-[13px]" />}>
                  {buildingAddress || "Address pending"}
                </Fact>
                <Fact icon={<Building2 className="size-[13px]" />}>
                  Units —{" "}
                  <span className="text-muted-foreground/70">
                    add on takeoff
                  </span>
                </Fact>
              </>
            )}
          </div>
        </div>

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
                      Came attached to {buildingName} — their name is on its
                      history.
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
                              {[c.title, c.company].filter(Boolean).join(" · ") ||
                                "—"}
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
        <Band
          num="3"
          title="Notes & files"
          note={<BandNote>Optional</BandNote>}
        >
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
              setFileNames(
                Array.from(e.target.files ?? []).map((f) => f.name),
              )
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
              <b className="font-semibold text-foreground">{buildingName}</b>
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

function Fact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-[12.5px] text-foreground/80 [&>svg]:text-muted-foreground/70">
      {icon}
      {children}
    </span>
  );
}
