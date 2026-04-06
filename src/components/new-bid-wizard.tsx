"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBidAction } from "@/lib/actions/create-bid";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { SatellitePreview } from "@/components/satellite-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

const mapsBrowserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

type ResolvedPlace = {
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  displayName: string | null;
};

const emptyResolved: ResolvedPlace = {
  address: "",
  lat: null,
  lng: null,
  placeId: null,
  displayName: null,
};

function suggestedPropertyName(r: ResolvedPlace): string {
  if (r.displayName?.trim()) return r.displayName.trim();
  const first = r.address.split(",")[0]?.trim();
  return first || "";
}

export function NewBidWizard({ errorMessage }: { errorMessage?: string | null }) {
  const [phase, setPhase] = useState<"address" | "confirm" | "details">(
    "address"
  );
  const [addressFieldKey, setAddressFieldKey] = useState(0);
  const [resolved, setResolved] = useState<ResolvedPlace>(emptyResolved);
  const [propertyName, setPropertyName] = useState("");
  const seededPropertyNameForConfirmRef = useRef(false);

  useEffect(() => {
    if (phase !== "confirm") {
      seededPropertyNameForConfirmRef.current = false;
      return;
    }
    if (seededPropertyNameForConfirmRef.current) return;
    const suggestion = suggestedPropertyName(resolved);
    if (suggestion) {
      setPropertyName(suggestion);
    }
    seededPropertyNameForConfirmRef.current = true;
  }, [phase, resolved]);

  const goToDetails = useCallback(
    (from: ResolvedPlace, options?: { preservePropertyName?: boolean }) => {
      setResolved(from);
      if (!options?.preservePropertyName) {
        setPropertyName(suggestedPropertyName(from));
      }
      setPhase("details");
    },
    []
  );

  const onResolve = useCallback(
    (p: ResolvedPlace) => {
      setResolved((prev) => ({
        ...prev,
        ...p,
      }));
      if (
        p.lat != null &&
        p.lng != null &&
        mapsBrowserKey &&
        p.address.trim().length > 0
      ) {
        setPhase("confirm");
      }
    },
    []
  );

  const handleAddressContinue = useCallback(() => {
    const addr = resolved.address.trim();
    if (addr.length === 0) return;
    if (resolved.lat != null && resolved.lng != null && mapsBrowserKey) {
      setPhase("confirm");
      return;
    }
    goToDetails(resolved);
  }, [resolved, goToDetails]);

  const handleConfirmContinue = useCallback(() => {
    const name = propertyName.trim() || suggestedPropertyName(resolved);
    setPropertyName(name);
    goToDetails(resolved, { preservePropertyName: true });
  }, [resolved, goToDetails, propertyName]);

  const handleChangeAddress = useCallback(() => {
    setPhase("address");
    setPropertyName("");
    setResolved((r) => ({
      ...r,
      lat: null,
      lng: null,
      placeId: null,
      displayName: null,
    }));
    setAddressFieldKey((k) => k + 1);
  }, []);

  const handleDetailsChangeAddress = useCallback(() => {
    setPhase("address");
    setAddressFieldKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {phase === "address" ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Property address</Label>
            <AddressAutocomplete
              key={addressFieldKey}
              id="address"
              required
              includeHiddenGeoFields={false}
              initialAddress={resolved.address}
              onResolve={onResolve}
            />
            <p className="text-xs text-muted-foreground">
              Start with the site address. Choose a suggestion when available so
              we can pin the property on a map.
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" asChild>
              <Link href="/bids">Cancel</Link>
            </Button>
            <Button type="button" onClick={handleAddressContinue}>
              Continue
            </Button>
          </div>
        </>
      ) : null}

      {phase === "confirm" &&
      resolved.lat != null &&
      resolved.lng != null ? (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold leading-tight">
              {resolved.displayName?.trim() ||
                suggestedPropertyName(resolved) ||
                "Confirm property"}
            </h2>
            <p className="text-sm text-muted-foreground">{resolved.address}</p>
          </div>
          <SatellitePreview lat={resolved.lat} lng={resolved.lng} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPropertyName">Property name</Label>
            <Input
              id="confirmPropertyName"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder={
                suggestedPropertyName(resolved) || "e.g. Jessups Reserve"
              }
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Prefilled from Google Places when available. Edit if needed before
              continuing.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleChangeAddress}
              className="sm:order-1"
            >
              Not the right property
            </Button>
            <Button type="button" onClick={handleConfirmContinue}>
              Continue
            </Button>
          </div>
        </>
      ) : null}

      {phase === "details" ? (
        <form action={createBidAction} className="flex flex-col gap-4">
          <input type="hidden" name="address" value={resolved.address} />
          <input
            type="hidden"
            name="latitude"
            value={resolved.lat != null ? String(resolved.lat) : ""}
          />
          <input
            type="hidden"
            name="longitude"
            value={resolved.lng != null ? String(resolved.lng) : ""}
          />
          <input
            type="hidden"
            name="googlePlaceId"
            value={resolved.placeId ?? ""}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="propertyName">Property name</Label>
            <Input
              id="propertyName"
              name="propertyName"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="Jessups Reserve"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Property address</Label>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={handleDetailsChangeAddress}
              >
                Change address
              </Button>
            </div>
            <p className="text-sm rounded-md border border-border bg-muted/30 px-3 py-2">
              {resolved.address || "—"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="clientName">Client / property manager</Label>
            <Input
              id="clientName"
              name="clientName"
              placeholder="Acme Property Management"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Number of buildings, special conditions, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" asChild>
              <Link href="/bids">Cancel</Link>
            </Button>
            <SubmitButton>Create bid</SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
