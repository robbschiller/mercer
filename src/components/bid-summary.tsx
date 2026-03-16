"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit bid details</CardTitle>
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
                defaultValue={bid.propertyName}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Property address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={bid.address}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="clientName">Client / property manager</Label>
              <Input
                id="clientName"
                name="clientName"
                defaultValue={bid.clientName}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={bid.notes}
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <StatusSelect defaultValue={bid.status} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{bid.propertyName}</CardTitle>
            <CardDescription>
              {bid.clientName} &middot; {bid.address}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">
              {statusLabels[bid.status] ?? bid.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {bid.notes && (
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {bid.notes}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
