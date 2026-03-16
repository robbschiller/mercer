import { getBuildingsForBid, getSurfacesForBuilding } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BuildingCard } from "@/components/building-card";
import { AddBuildingForm } from "@/components/add-building-form";

export async function BuildingList({ bidId }: { bidId: string }) {
  const buildings = await getBuildingsForBid(bidId);

  const buildingsWithSurfaces = await Promise.all(
    buildings.map(async (building) => ({
      building,
      surfaces: await getSurfacesForBuilding(building.id),
    }))
  );

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
          {buildingsWithSurfaces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No buildings added yet.
            </p>
          ) : (
            buildingsWithSurfaces.map(({ building, surfaces }) => (
              <BuildingCard
                key={building.id}
                building={building}
                surfaces={surfaces}
              />
            ))
          )}
          <AddBuildingForm bidId={bidId} />
        </div>
      </CardContent>
    </Card>
  );
}
