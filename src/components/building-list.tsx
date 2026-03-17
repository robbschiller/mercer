import type { Surface } from "@/lib/store";
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
  return (
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
  );
}
