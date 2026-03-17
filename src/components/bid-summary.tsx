"use client";

import { useState, useMemo } from "react";
import { ClipboardList, Pencil } from "lucide-react";
import { updateBidAction } from "@/lib/actions";
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
import { StatusSelect } from "@/components/status-select";
import type { Bid } from "@/lib/store";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  won: "Won",
  lost: "Lost",
};

export function BidSummary({ bid }: { bid: Bid }) {
  const [editing, setEditing] = useState(false);

  const [propertyName, setPropertyName] = useState(bid.propertyName);
  const [address, setAddress] = useState(bid.address);
  const [clientName, setClientName] = useState(bid.clientName);
  const [notes, setNotes] = useState(bid.notes);
  const [status, setStatus] = useState<string>(bid.status);

  const isDirty = useMemo(
    () =>
      propertyName !== bid.propertyName ||
      address !== bid.address ||
      clientName !== bid.clientName ||
      notes !== bid.notes ||
      status !== bid.status,
    [propertyName, address, clientName, notes, status, bid]
  );

  function resetForm() {
    setPropertyName(bid.propertyName);
    setAddress(bid.address);
    setClientName(bid.clientName);
    setNotes(bid.notes);
    setStatus(bid.status);
  }

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
              <Input
                id="address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
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

  return (
    <Card
      className="cursor-pointer hover:border-foreground/20 transition-colors"
      onClick={() => setEditing(true)}
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
                  {statusLabels[bid.status] ?? bid.status}
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
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
