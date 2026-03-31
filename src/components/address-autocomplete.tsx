"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function getMapsApiKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return k || undefined;
}

const SUGGEST_DEBOUNCE_MS = 250;
const MIN_QUERY_LEN = 2;

interface AddressAutocompleteProps {
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  initialAddress?: string;
  /** When false, parent supplies hidden `latitude` / `longitude` / `googlePlaceId` inputs. */
  includeHiddenGeoFields?: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  initialPlaceId?: string | null;
  onResolve?: (p: {
    address: string;
    lat: number | null;
    lng: number | null;
    placeId: string | null;
  }) => void;
}

export function AddressAutocomplete({
  id = "address",
  required,
  disabled,
  className,
  initialAddress = "",
  includeHiddenGeoFields = true,
  initialLat = null,
  initialLng = null,
  initialPlaceId = null,
  onResolve,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeqRef = useRef(0);
  const onResolveRef = useRef(onResolve);
  const placesReadyRef = useRef(false);
  onResolveRef.current = onResolve;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [placesReady, setPlacesReady] = useState(false);
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [placeId, setPlaceId] = useState<string | null>(initialPlaceId);
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>(
    []
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useLayoutEffect(() => {
    setLat(initialLat);
    setLng(initialLng);
    setPlaceId(initialPlaceId);
  }, [initialLat, initialLng, initialPlaceId]);

  useEffect(() => {
    placesReadyRef.current = placesReady;
  }, [placesReady]);

  const apiKey = getMapsApiKey();

  useLayoutEffect(() => {
    if (!apiKey || disabled || loadError != null) return;

    let cancelled = false;

    async function init() {
      try {
        setLoadError(null);
        setOptions({ key: apiKey, v: "weekly" });
        await importLibrary("places");
        if (cancelled) return;
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setPlacesReady(true);
      } catch (e) {
        console.error("[AddressAutocomplete] Failed to load Google Places:", e);
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Could not load address suggestions"
          );
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      setPlacesReady(false);
      placesReadyRef.current = false;
      sessionTokenRef.current = null;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [apiKey, disabled, loadError]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  function clearDebounce() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  async function runFetch(query: string) {
    const seq = ++fetchSeqRef.current;
    const token = sessionTokenRef.current;
    if (!token || !placesReadyRef.current) return;

    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    try {
      const { suggestions: raw } =
        await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: token,
        });
      if (seq !== fetchSeqRef.current) return;
      const preds = raw
        .map((s) => s.placePrediction)
        .filter((p): p is google.maps.places.PlacePrediction => p != null);
      setSuggestions(preds);
      setOpen(preds.length > 0);
      setActiveIndex(-1);
    } catch (e) {
      if (seq !== fetchSeqRef.current) return;
      console.error("[AddressAutocomplete] fetchAutocompleteSuggestions:", e);
      setSuggestions([]);
      setOpen(false);
    }
  }

  function scheduleFetch() {
    clearDebounce();
    const el = inputRef.current;
    if (!el || !placesReadyRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runFetch(el.value);
    }, SUGGEST_DEBOUNCE_MS);
  }

  async function pickPrediction(pred: google.maps.places.PlacePrediction) {
    const input = inputRef.current;
    const place = pred.toPlace();
    try {
      await place.fetchFields({
        fields: ["formattedAddress", "location", "id"],
      });
    } catch (e) {
      console.error("[AddressAutocomplete] fetchFields:", e);
      return;
    }

    const formatted = place.formattedAddress ?? pred.text.text;
    const loc = place.location;
    const nextLat = loc ? loc.lat() : null;
    const nextLng = loc ? loc.lng() : null;
    const nextPlaceId = place.id ?? pred.placeId ?? null;

    if (input) {
      input.value = formatted;
    }

    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);

    if (includeHiddenGeoFields) {
      setLat(nextLat);
      setLng(nextLng);
      setPlaceId(nextPlaceId);
    }

    onResolveRef.current?.({
      address: formatted || input?.value || "",
      lat: nextLat,
      lng: nextLng,
      placeId: nextPlaceId,
    });
  }

  function handleInput() {
    const el = inputRef.current;
    if (!el) return;
    const v = el.value;

    if (includeHiddenGeoFields) {
      setLat(null);
      setLng(null);
      setPlaceId(null);
    }

    onResolveRef.current?.({
      address: v,
      lat: null,
      lng: null,
      placeId: null,
    });

    scheduleFetch();
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      void pickPrediction(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col gap-1">
        <Input
          id={id}
          name="address"
          defaultValue={initialAddress}
          required={required}
          disabled={disabled}
          className={className}
          placeholder="123 Main St, City, State"
          onChange={(e) =>
            onResolveRef.current?.({
              address: e.target.value,
              lat: null,
              lng: null,
              placeId: null,
            })
          }
        />
        {includeHiddenGeoFields ? (
          <>
            <input type="hidden" name="latitude" defaultValue="" />
            <input type="hidden" name="longitude" defaultValue="" />
            <input type="hidden" name="googlePlaceId" defaultValue="" />
          </>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Add{" "}
          <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
          to <code className="rounded bg-muted px-1 py-0.5">.env.local</code> and restart{" "}
          <code className="rounded bg-muted px-1 py-0.5">bun run dev</code> for address
          suggestions.
        </p>
      </div>
    );
  }

  if (loadError != null) {
    return (
      <div className="flex flex-col gap-1">
        <Input
          id={id}
          name="address"
          defaultValue={initialAddress}
          required={required}
          disabled={disabled}
          className={className}
          placeholder="123 Main St, City, State"
          onChange={(e) =>
            onResolveRef.current?.({
              address: e.target.value,
              lat: null,
              lng: null,
              placeId: null,
            })
          }
        />
        {includeHiddenGeoFields ? (
          <>
            <input type="hidden" name="latitude" defaultValue="" />
            <input type="hidden" name="longitude" defaultValue="" />
            <input type="hidden" name="googlePlaceId" defaultValue="" />
          </>
        ) : null}
        <p className="text-xs text-destructive">
          Address suggestions unavailable ({loadError}). Enable{" "}
          <strong>Maps JavaScript API</strong> and{" "}
          <strong>Places API (New)</strong> for this key, ensure billing is active, and allow
          this origin under HTTP referrer restrictions. Check the browser console for
          details.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-0">
      <Input
        ref={inputRef}
        id={id}
        name="address"
        type="text"
        defaultValue={initialAddress}
        required={required}
        disabled={disabled}
        className={cn(className)}
        placeholder="Start typing an address…"
        onInput={handleInput}
        onKeyDown={onInputKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? `${id}-address-suggestions` : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined
        }
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={`${id}-address-suggestions`}
          role="listbox"
          className={cn(
            "absolute top-full z-[100000] mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
          )}
        >
          {suggestions.map((pred, i) => (
            <li
              key={`${pred.placeId}-${i}`}
              id={`${id}-suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                "cursor-pointer px-3 py-2",
                i === activeIndex ? "bg-accent" : "hover:bg-accent/80"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void pickPrediction(pred)}
            >
              {pred.text.text}
            </li>
          ))}
        </ul>
      ) : null}
      {includeHiddenGeoFields ? (
        <>
          <input
            type="hidden"
            name="latitude"
            value={lat != null ? String(lat) : ""}
            onChange={() => {}}
          />
          <input
            type="hidden"
            name="longitude"
            value={lng != null ? String(lng) : ""}
            onChange={() => {}}
          />
          <input
            type="hidden"
            name="googlePlaceId"
            value={placeId ?? ""}
            onChange={() => {}}
          />
        </>
      ) : null}
    </div>
  );
}
