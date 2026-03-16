"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { updateBuildingAction, deleteBuildingAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { SurfaceList } from "@/components/surface-list";
import { AddSurfaceForm } from "@/components/add-surface-form";
import type { Surface } from "@/lib/store";

interface BuildingWithTotal {
  id: string;
  bidId: string;
  label: string;
  count: number;
  totalSqft: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export function BuildingCard({
  building,
  surfaces,
}: {
  building: BuildingWithTotal;
  surfaces: Surface[];
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const buildingSqft = building.totalSqft;
  const totalWithCount = buildingSqft * building.count;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {editing ? (
          <form
            action={async (formData) => {
              await updateBuildingAction(formData);
              setEditing(false);
            }}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="id" value={building.id} />
            <input type="hidden" name="bidId" value={building.bidId} />
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor={`edit-label-${building.id}`} className="text-xs">
                  Label
                </Label>
                <Input
                  id={`edit-label-${building.id}`}
                  name="label"
                  defaultValue={building.label}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5 w-20">
                <Label htmlFor={`edit-count-${building.id}`} className="text-xs">
                  Count
                </Label>
                <Input
                  id={`edit-count-${building.id}`}
                  name="count"
                  type="number"
                  min={1}
                  defaultValue={building.count}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <SubmitButton size="sm">Save</SubmitButton>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 flex-1 min-w-0 text-left"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-medium truncate">{building.label}</span>
                {building.count > 1 && (
                  <span className="text-muted-foreground text-sm shrink-0">
                    &times;{building.count}
                  </span>
                )}
              </button>
              <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                {totalWithCount > 0
                  ? `${totalWithCount.toLocaleString()} sqft`
                  : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <form action={deleteBuildingAction}>
                <input type="hidden" name="id" value={building.id} />
                <input type="hidden" name="bidId" value={building.bidId} />
                <Button
                  variant="ghost"
                  size="icon"
                  type="submit"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>

            {expanded && (
              <div className="mt-3 ml-5 flex flex-col gap-3">
                {building.count > 1 && buildingSqft > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {buildingSqft.toLocaleString()} sqft per building &times;{" "}
                    {building.count} = {totalWithCount.toLocaleString()} sqft
                  </p>
                )}

                <SurfaceList
                  surfaces={surfaces}
                  bidId={building.bidId}
                />

                <AddSurfaceForm
                  buildingId={building.id}
                  bidId={building.bidId}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
