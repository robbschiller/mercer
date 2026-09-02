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

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function BidSummary({
  bid,
  quoteTotal = null,
  contactName = null,
}: {
  bid: Bid;
  /** The engine's computed total, shown as an estimate when no quote is typed. */
  quoteTotal?: number | null;
  contactName?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [editSession, setEditSession] = useState(0);

  const [propertyName, setPropertyName] = useState(bid.propertyName);
  const [label, setLabel] = useState(bid.label ?? "");
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
  /* Tracking fields (Phase 2). */
  const [quoteAmount, setQuoteAmount] = useState(bid.quoteAmount ?? "");
  const [quoteSentAt, setQuoteSentAt] = useState(bid.quoteSentAt ?? "");
  const [decisionDueAt, setDecisionDueAt] = useState(bid.decisionDueAt ?? "");
  const [jobSize, setJobSize] = useState<"" | "small" | "large">(
    bid.isLargeJob == null ? "" : bid.isLargeJob ? "large" : "small",
  );

  const isDirty = useMemo(
    () =>
      propertyName !== bid.propertyName ||
      label !== (bid.label ?? "") ||
      address !== bid.address ||
      toNum(latitude) !== toNum(bid.latitude) ||
      toNum(longitude) !== toNum(bid.longitude) ||
      (googlePlaceId ?? "") !== (bid.googlePlaceId ?? "") ||
      clientName !== bid.clientName ||
      notes !== bid.notes ||
      status !== bid.status ||
      quoteAmount !== (bid.quoteAmount ?? "") ||
      quoteSentAt !== (bid.quoteSentAt ?? "") ||
      decisionDueAt !== (bid.decisionDueAt ?? "") ||
      jobSize !== (bid.isLargeJob == null ? "" : bid.isLargeJob ? "large" : "small"),
    [
      propertyName,
      label,
      address,
      latitude,
      longitude,
      googlePlaceId,
      clientName,
      notes,
      status,
      bid,
      quoteAmount,
      quoteSentAt,
      decisionDueAt,
      jobSize,
    ]
  );

  const resetForm = useCallback(() => {
    setPropertyName(bid.propertyName);
    setLabel(bid.label ?? "");
    setAddress(bid.address);
    setLatitude(toNum(bid.latitude));
    setLongitude(toNum(bid.longitude));
    setGooglePlaceId(bid.googlePlaceId ?? null);
    setClientName(bid.clientName);
    setNotes(bid.notes);
    setStatus(bid.status);
    setQuoteAmount(bid.quoteAmount ?? "");
    setQuoteSentAt(bid.quoteSentAt ?? "");
    setDecisionDueAt(bid.decisionDueAt ?? "");
    setJobSize(bid.isLargeJob == null ? "" : bid.isLargeJob ? "large" : "small");
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
              <CardTitle className="text-lg">Opportunity Details</CardTitle>
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
              <Label htmlFor="label">Job name</Label>
              <Input
                id="label"
                name="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Full exterior repaint"
              />
            </div>

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

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
                Tracking
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="quoteAmount">Quote amount ($)</Label>
                  <Input
                    id="quoteAmount"
                    name="quoteAmount"
                    type="number"
                    min="0"
                    step="100"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder={quoteTotal ? String(Math.round(quoteTotal)) : "0"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jobSize">Job size</Label>
                  <select
                    id="jobSize"
                    name="jobSize"
                    value={jobSize}
                    onChange={(e) => setJobSize(e.target.value as "" | "small" | "large")}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">— not set —</option>
                    <option value="small">Small (days, one crew)</option>
                    <option value="large">Large (2+ weeks)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="quoteSentAt">Quote sent</Label>
                  <Input
                    id="quoteSentAt"
                    name="quoteSentAt"
                    type="date"
                    value={quoteSentAt}
                    onChange={(e) => setQuoteSentAt(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="decisionDueAt">Decision expected</Label>
                  <Input
                    id="decisionDueAt"
                    name="decisionDueAt"
                    type="date"
                    value={decisionDueAt}
                    onChange={(e) => setDecisionDueAt(e.target.value)}
                  />
                </div>
              </div>
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
                <CardTitle className="text-base">
                  {bid.label || bid.propertyName}
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  {bidStatusLabel(bid.status)}
                </Badge>
              </div>
              <CardDescription>
                {[
                  bid.label ? bid.propertyName : null,
                  // Skip a client that merely repeats the title (old test rows).
                  bid.clientName &&
                  bid.clientName !== bid.label &&
                  bid.clientName !== bid.propertyName
                    ? bid.clientName
                    : null,
                  bid.address,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </CardDescription>
              <TrackingStrip
                bid={bid}
                quoteTotal={quoteTotal}
                contactName={contactName}
              />
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

/** One line of the numbers Jordan tracks by hand (Phase 2). */
function TrackingStrip({
  bid,
  quoteTotal,
  contactName,
}: {
  bid: Bid;
  quoteTotal: number | null;
  contactName: string | null;
}) {
  const typed = bid.quoteAmount != null ? Number(bid.quoteAmount) : null;
  const amount = typed != null && Number.isFinite(typed) ? typed : null;
  const sent = fmtDate(bid.quoteSentAt);
  const due = fmtDate(bid.decisionDueAt);
  const overdue =
    bid.decisionDueAt != null &&
    bid.status === "sent" &&
    new Date(`${bid.decisionDueAt}T23:59:59`).getTime() < Date.now();
  const items: { label: string; value: string; tone?: "amber" | "muted" }[] = [];
  if (amount != null) items.push({ label: "Quote", value: money.format(amount) });
  else if (quoteTotal && quoteTotal > 0)
    items.push({ label: "Est.", value: money.format(quoteTotal), tone: "muted" });
  else items.push({ label: "Quote", value: "not set", tone: "muted" });
  items.push({ label: "Sent", value: sent ?? "—", tone: sent ? undefined : "muted" });
  items.push({
    label: "Decision",
    value: due ?? "—",
    tone: overdue ? "amber" : due ? undefined : "muted",
  });
  items.push({
    label: "Size",
    value: bid.isLargeJob == null ? "—" : bid.isLargeJob ? "Large" : "Small",
    tone: bid.isLargeJob == null ? "muted" : undefined,
  });
  if (contactName) items.push({ label: "Contact", value: contactName });
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-baseline gap-1">
          <span className="text-muted-foreground">{it.label}</span>
          <span
            className={
              it.tone === "amber"
                ? "font-semibold text-amber-700 dark:text-amber-400"
                : it.tone === "muted"
                  ? "text-muted-foreground/70"
                  : "font-medium text-foreground"
            }
          >
            {it.value}
            {it.tone === "amber" ? " · overdue" : ""}
          </span>
        </span>
      ))}
    </div>
  );
}
