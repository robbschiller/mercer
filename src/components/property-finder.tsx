"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import {
  BadgeCheck,
  Building2,
  CircleCheck,
  CornerDownLeft,
  History,
  MapPin,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { searchKnownPropertiesAction } from "@/lib/actions";
import type { KnownBuilding } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ============================================================
   The property finder — the shared intake pattern (§7/§8).
   Finding the building feels like Google Maps: one oversized
   search pill, a merged dropdown (buildings Mercer knows on top,
   live Places results below), and an aerial building card once
   it locks. New Lead and New Bid both ride on this module.
   ============================================================ */

export function moneyK(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "").replace(/\.$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
export function monthYear(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
export const REPAINT_CYCLE_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;
export function repaintDue(b: KnownBuilding): boolean {
  return (
    b.lastWonAt != null &&
    Date.now() - new Date(b.lastWonAt).getTime() > REPAINT_CYCLE_MS
  );
}

export type PlacePick = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
};

export type FinderBuilding =
  | ({ kind: "known" } & KnownBuilding)
  | ({ kind: "place" } & PlacePick)
  | { kind: "custom"; text: string };

export function buildingName(b: FinderBuilding): string {
  return b.kind === "custom" ? b.text : (b.name ?? b.address ?? "");
}
export function buildingAddress(b: FinderBuilding): string {
  return b.kind === "custom" ? b.text : (b.address ?? "");
}

function mapsKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return k || undefined;
}
function staticAerial(lat: number, lng: number): string | null {
  const key = mapsKey();
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x300&scale=2&maptype=satellite&key=${key}`;
}
export function aerialUrlFor(b: FinderBuilding): string | null {
  if (b.kind === "known") {
    if (b.satelliteImageUrl) return b.satelliteImageUrl;
    if (b.latitude != null && b.longitude != null)
      return staticAerial(b.latitude, b.longitude);
    return null;
  }
  if (b.kind === "place" && b.lat != null && b.lng != null)
    return staticAerial(b.lat, b.lng);
  return null;
}

/* ── the search pill + merged dropdown ── */

type Pred = {
  placeId: string;
  main: string;
  sub: string;
  pred?: google.maps.places.PlacePrediction;
};

export function PropertyFinder({
  flavor,
  recentWhenEmpty = false,
  onLock,
}: {
  flavor: "lead" | "bid";
  /** Bid finder shows recent known buildings before the user types. */
  recentWhenEmpty?: boolean;
  onLock: (b: FinderBuilding) => void;
}) {
  const [query, setQuery] = useState("");
  const [known, setKnown] = useState<KnownBuilding[]>([]);
  const [preds, setPreds] = useState<Pred[]>([]);
  const [resolving, setResolving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);
  const predsRef = useRef<Pred[]>([]);
  const knownRef = useRef<KnownBuilding[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const readyRef = useRef(false);

  useEffect(() => {
    const key = mapsKey();
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        setOptions({ key, v: "weekly" });
        await importLibrary("places");
        if (cancelled) return;
        tokenRef.current = new google.maps.places.AutocompleteSessionToken();
        readyRef.current = true;
      } catch (e) {
        console.error("[PropertyFinder] Places load failed:", e);
      }
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const seq = ++seqRef.current;
    const term = q.trim();
    if (term.length < 2) {
      setPreds([]);
      predsRef.current = [];
      // keep the recent list when the query empties
      return;
    }
    const [knownRes, placeRes] = await Promise.all([
      searchKnownPropertiesAction(term).catch(() => [] as KnownBuilding[]),
      (async (): Promise<Pred[]> => {
        if (!readyRef.current || !tokenRef.current) return [];
        try {
          const { suggestions } =
            await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
              { input: term, sessionToken: tokenRef.current },
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
    knownRef.current = knownRes;
    setPreds(placeRes);
    predsRef.current = placeRes;
  }, []);

  // Recent buildings before the first keystroke (bid flavor).
  useEffect(() => {
    if (!recentWhenEmpty) return;
    let cancelled = false;
    searchKnownPropertiesAction("")
      .then((rows) => {
        if (cancelled || seqRef.current > 0) return;
        setKnown(rows);
        knownRef.current = rows;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [recentWhenEmpty]);

  function onQueryChange(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(v), 220);
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
        tokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }
      onLock({ kind: "place", ...pick });
    } finally {
      setResolving(false);
    }
  }

  const hasQuery = query.trim().length >= 2;
  const showDropdown = hasQuery || (recentWhenEmpty && known.length > 0);
  const showKnown = known.length > 0;

  return (
    <div className="relative">
      <div className="flex h-[68px] items-center gap-3.5 rounded-full border-[1.5px] bg-card pl-[22px] pr-3.5 shadow-[0_2px_4px_rgb(0_0_0/0.04),0_8px_30px_-14px_rgb(0_0_0/0.18)] transition-[border-color,box-shadow] focus-within:border-foreground/40 focus-within:shadow-[0_2px_4px_rgb(0_0_0/0.04),0_0_0_4px_rgb(0_0_0/0.06)]">
        <Search className="size-[22px] shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (hasQuery && knownRef.current[0])
              onLock({ kind: "known", ...knownRef.current[0] });
            else if (predsRef.current[0]) void pickPlace(0);
            else if (query.trim()) onLock({ kind: "custom", text: query.trim() });
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
              setPreds([]);
              predsRef.current = [];
              inputRef.current?.focus();
            }}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <X className="size-[17px]" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="mt-3 overflow-hidden rounded-[18px] border bg-card shadow-[0_18px_44px_-14px_rgb(0_0_0/0.26),0_2px_6px_rgb(0_0_0/0.06)]">
          {showKnown && (
            <div>
              <div className="flex items-center gap-2 px-[18px] pb-1 pt-3">
                <History className="size-3.5 text-muted-foreground/70" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  {hasQuery
                    ? flavor === "bid"
                      ? "In Mercer — buildings you've bid"
                      : "In Mercer — buildings you've worked"
                    : "Recent — buildings you've bid, quoted or won"}
                </span>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/70">
                  {known.length}
                </span>
              </div>
              {known.map((b, i) => (
                <KnownSuggestion
                  key={b.id}
                  b={b}
                  flavor={flavor}
                  pre={hasQuery && i === 0}
                  onPick={() => onLock({ kind: "known", ...b })}
                />
              ))}
            </div>
          )}

          {hasQuery && (
            <div className={cn(showKnown && "border-t border-border/60")}>
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
                  onClick={() => onLock({ kind: "custom", text: query.trim() })}
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
                      Drop a pin at this address — new building
                    </span>
                  </span>
                  <CornerDownLeft className="size-4 shrink-0 text-muted-foreground/50" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-[18px] py-2.5 text-xs text-muted-foreground/80">
            {hasQuery ? (
              <>
                <CornerDownLeft className="size-[13px] shrink-0" />
                {flavor === "bid"
                  ? "Picking a known building reuses its record and its takeoff — no duplicates, no re-measuring."
                  : "Picking a known building attaches the existing record — no duplicates."}
              </>
            ) : (
              <>
                <Search className="size-[13px] shrink-0" />
                Start typing an address to search Maps for a building you
                haven&apos;t bid yet.
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KnownSuggestion({
  b,
  flavor,
  pre,
  onPick,
}: {
  b: KnownBuilding;
  flavor: "lead" | "bid";
  pre: boolean;
  onPick: () => void;
}) {
  const due = repaintDue(b);
  const hasSpecs =
    b.sqftNonfloor != null ||
    b.breezewayCount != null ||
    b.stairSystemCount != null;

  const chip =
    flavor === "bid" ? (
      hasSpecs ? (
        <Chip className="border-foreground bg-foreground text-background">
          <Sparkles className="size-[11px]" />
          Specs on file
        </Chip>
      ) : b.liveBidId ? (
        <Chip className="border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-400">
          <Send className="size-[11px]" />
          Quote out
        </Chip>
      ) : b.jobs > 0 ? (
        <Chip className="border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
          <CircleCheck className="size-[11px]" />
          Won here
        </Chip>
      ) : (
        <Chip className="border-border bg-muted/60 text-foreground/70">
          <History className="size-[11px]" />
          Known
        </Chip>
      )
    ) : (
      <Chip className="border-border bg-muted/60 text-foreground/70">
        <History className="size-[11px]" />
        Known
      </Chip>
    );

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-3.5 px-[18px] py-3 text-left transition-colors hover:bg-muted/40",
        pre && "bg-muted/25",
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
          {chip}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
          {[b.address, b.managementName].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
          <b className="font-medium text-foreground">{moneyK(b.lifetime)}</b> ·{" "}
          {b.jobs} job{b.jobs === 1 ? "" : "s"}
        </span>
        {flavor === "bid" && b.liveBidId && hasSpecs ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-blue-600/25 bg-blue-600/10 px-2.5 py-[3px] text-[10.5px] font-semibold text-blue-700 dark:text-blue-400">
            Quote out
          </span>
        ) : due ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-[3px] text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <RotateCcw className="size-3" />
            Repaint due
          </span>
        ) : null}
      </span>
    </button>
  );
}

function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-px text-[10.5px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── the locked aerial building card ── */

export function AerialBuildingCard({
  building,
  onBack,
  banner,
  facts,
}: {
  building: FinderBuilding;
  onBack: () => void;
  banner: React.ReactNode;
  facts: React.ReactNode;
}) {
  const name = buildingName(building);
  const address = buildingAddress(building);
  const aerialUrl = aerialUrlFor(building);
  const inMercer = building.kind === "known";

  return (
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
        <span className="pointer-events-none absolute left-1/2 top-[44%] z-[3] -translate-x-1/2 -translate-y-full animate-[pinDrop_.5s_cubic-bezier(.34,1.3,.5,1)_both]">
          <span className="relative block size-7 -rotate-45 rounded-[50%_50%_50%_0] bg-foreground shadow-[0_8px_18px_-4px_rgb(0_0_0/0.55)] dark:bg-background">
            <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background dark:bg-foreground" />
          </span>
        </span>
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3.5 top-3.5 z-[4] inline-flex h-8 items-center gap-2 rounded-full bg-black/50 px-3.5 text-[12.5px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/70"
        >
          <span className="font-mono text-[13px]">⌫</span>
          not it? search again
        </button>
        {inMercer && (
          <span className="pointer-events-none absolute right-3.5 top-3.5 z-[3] inline-flex h-[30px] items-center gap-1.5 rounded-full bg-black/50 px-3 text-[11.5px] font-semibold text-white backdrop-blur-md">
            <BadgeCheck className="size-[13px]" />
            In Mercer
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-5 bottom-[18px] z-[3]">
          <p className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.45)]">
            <MapPin className="size-5 opacity-90" />
            {name}
          </p>
          <p className="ml-[29px] mt-1 text-[13.5px] text-white/85 [text-shadow:0_1px_10px_rgb(0_0_0/0.5)]">
            {address}
          </p>
        </div>
      </div>
      {banner}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-5 py-3">
        {facts}
      </div>
    </div>
  );
}

export function Fact({
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

/* ── shared ghost band (the dimmed what-comes-next preview) ── */

export function GhostSteps({
  steps,
}: {
  steps: { n: string; t: string; w: number[] }[];
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none mt-8 select-none opacity-50 [mask-image:linear-gradient(180deg,#000_0%,#000_30%,transparent_96%)]"
    >
      {steps.map((g) => (
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
  );
}
