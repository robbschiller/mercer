"use client";

import { useState, useMemo, useCallback } from "react";
import { ClipboardList, Pencil } from "lucide-react";
import { updateBidAction } from "@/lib/actions";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { SatellitePreview } from "@/components/satellite-preview";
import { StatusSelect } from "@/components/status-select";
import { buildGoogleMapsUrl } from "@/lib/maps/google-maps-url";
import { bidStatusLabel } from "@/lib/status-meta";
import type { Bid } from "@/lib/store";

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function BidSummary({ bid }: { bid: Bid }) {
  const [editing, setEditing] = useState(false);
  const [editSession, setEditSession] = useState(0);

  const [propertyName, setPropertyName] = useState(bid.propertyName);
  const [address, setAddress] = useState(bid.address);
  const [latitude, setLatitude] = useState<number | null>(() =>
    toNum(bid.latitude)
  );
  const [longitude, setLongitude] = useState<number | null>(() =>
    toNum(bid.longitude)
  );
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(
    bid.googlePlaceId ?? null
  );
  const [clientName, setClientName] = useState(bid.clientName);
  const [notes, setNotes] = useState(bid.notes);
  const [status, setStatus] = useState<string>(bid.status);

  const isDirty = useMemo(
    () =>
      propertyName !== bid.propertyName ||
      address !== bid.address ||
      toNum(latitude) !== toNum(bid.latitude) ||
      toNum(longitude) !== toNum(bid.longitude) ||
      (googlePlaceId ?? "") !== (bid.googlePlaceId ?? "") ||
      clientName !== bid.clientName ||
      notes !== bid.notes ||
      status !== bid.status,
    [
      propertyName,
      address,
      latitude,
      longitude,
      googlePlaceId,
      clientName,
      notes,
      status,
      bid,
    ]
  );

  const resetForm = useCallback(() => {
    setPropertyName(bid.propertyName);
    setAddress(bid.address);
    setLatitude(toNum(bid.latitude));
    setLongitude(toNum(bid.longitude));
    setGooglePlaceId(bid.googlePlaceId ?? null);
    setClientName(bid.clientName);
    setNotes(bid.notes);
    setStatus(bid.status);
  }, [bid]);

  const openEdit = useCallback(() => {
    resetForm();
    setEditSession((s) => s + 1);
    setEditing(true);
  }, [resetForm]);

  const mapsUrlEdit = useMemo(
    () =>
      buildGoogleMapsUrl({
        address,
        latitude,
        longitude,
        googlePlaceId,
      }),
    [address, latitude, longitude, googlePlaceId]
  );

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Bid Details</CardTitle>
              <CardDescription>
                Property info, client, and status.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setEditing(false);
              }}
            >
              Done
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              await updateBidAction(formData);
              setEditing(false);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={bid.id} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="propertyName">Property name</Label>
              <Input
                id="propertyName"
                name="propertyName"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Property address</Label>
              <AddressAutocomplete
                key={`addr-${editSession}`}
                id="address"
                initialAddress={address}
                includeHiddenGeoFields={false}
                required
                onResolve={(p) => {
                  setAddress(p.address);
                  setLatitude(p.lat);
                  setLongitude(p.lng);
                  setGooglePlaceId(p.placeId);
                }}
              />
              <input
                type="hidden"
                name="latitude"
                value={
                  latitude === null || latitude === undefined
                    ? ""
                    : String(latitude)
                }
                onChange={() => {}}
              />
              <input
                type="hidden"
                name="longitude"
                value={
                  longitude === null || longitude === undefined
                    ? ""
                    : String(longitude)
                }
                onChange={() => {}}
              />
              <input
                type="hidden"
                name="googlePlaceId"
                value={googlePlaceId ?? ""}
                onChange={() => {}}
              />
              {mapsUrlEdit ? (
                <a
                  href={mapsUrlEdit}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open in Google Maps
                </a>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="clientName">Client / property manager</Label>
              <Input
                id="clientName"
                name="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <StatusSelect defaultValue={status} onValueChange={setStatus} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForm();
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <SubmitButton disabled={!isDirty}>Save changes</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  const summaryLat = toNum(bid.latitude);
  const summaryLng = toNum(bid.longitude);
  const mapsUrlRead = buildGoogleMapsUrl({
    address: bid.address,
    latitude: bid.latitude,
    longitude: bid.longitude,
    googlePlaceId: bid.googlePlaceId,
  });
  const showSatellite = summaryLat != null && summaryLng != null;

  return (
    <Card
      className="cursor-pointer hover:border-foreground/20 transition-colors"
      onClick={openEdit}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{bid.propertyName}</CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  {bidStatusLabel(bid.status)}
                </Badge>
              </div>
              <CardDescription>
                {bid.clientName} &middot; {bid.address}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              openEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      {mapsUrlRead || showSatellite ? (
        <CardContent
          className="pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-2">
            {mapsUrlRead ? (
              <a
                href={mapsUrlRead}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open in Google Maps
              </a>
            ) : null}
            {showSatellite ? (
              <SatellitePreview
                lat={summaryLat}
                lng={summaryLng}
                satellitePath={bid.satelliteImageUrl}
              />
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
