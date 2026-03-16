import type { Surface } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BuildingCard } from "@/components/building-card";
import { AddBuildingForm } from "@/components/add-building-form";

interface BuildingWithSqft {
  id: string;
  bidId: string;
  label: string;
  count: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  totalSqft: number;
}

export function BuildingList({
  bidId,
  buildings,
  surfacesByBuilding,
}: {
  bidId: string;
  buildings: BuildingWithSqft[];
  surfacesByBuilding: Record<string, Surface[]>;
}) {
  const grandTotal = buildings.reduce(
    (sum, b) => sum + b.totalSqft * b.count,
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Buildings</CardTitle>
            <CardDescription>
              Add building types with counts and measurements to calculate your
              bid.
            </CardDescription>
          </div>
          {grandTotal > 0 && (
            <span className="text-sm font-medium tabular-nums">
              {grandTotal.toLocaleString()} sqft total
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {buildings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No buildings added yet.
            </p>
          ) : (
            buildings.map((building) => (
              <BuildingCard
                key={building.id}
                building={building}
                surfaces={surfacesByBuilding[building.id] ?? []}
              />
            ))
          )}
          <AddBuildingForm bidId={bidId} />
        </div>
      </CardContent>
    </Card>
  );
}
