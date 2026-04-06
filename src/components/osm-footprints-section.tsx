import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCachedOsmFootprints } from "@/lib/osm/overpass";

function formatSqm(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${Math.round(n).toLocaleString()}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString();
}

type Props = {
  latitude: number | null;
  longitude: number | null;
};

export async function OsmFootprintsSection({ latitude, longitude }: Props) {
  const lat =
    latitude != null && Number.isFinite(Number(latitude))
      ? Number(latitude)
      : null;
  const lng =
    longitude != null && Number.isFinite(Number(longitude))
      ? Number(longitude)
      : null;

  if (lat == null || lng == null) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">OpenStreetMap footprints</CardTitle>
          <CardDescription>
            Add an address with map coordinates (Places autocomplete) to load
            building outlines from OpenStreetMap near this property.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const result = await getCachedOsmFootprints(lat, lng);

  if (result.status === "error") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">OpenStreetMap footprints</CardTitle>
          <CardDescription className="text-destructive">
            {result.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (result.status === "empty") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">OpenStreetMap footprints</CardTitle>
          <CardDescription>
            {result.message} Searched within {result.radiusM} m of the pin.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { buildings, totalAreaSqm, radiusM } = result;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">OpenStreetMap footprints</CardTitle>
        <CardDescription>
          {buildings.length} building outline
          {buildings.length !== 1 ? "s" : ""} within {radiusM} m (approximate
          footprint areas from community-maintained data). Large sites may span
          multiple tiles; coverage varies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm text-muted-foreground">
          Combined footprint area (all outlines):{" "}
          <span className="font-medium text-foreground tabular-nums">
            ~{formatSqm(totalAreaSqm)} m²
          </span>
        </p>
        <div className="max-h-56 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Area (m²)</th>
                <th className="px-3 py-2 font-medium">OSM tag</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((b, i) => (
                <tr
                  key={b.osmWayId}
                  className={i % 2 === 1 ? "bg-muted/30" : undefined}
                >
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {formatSqm(b.areaSqm)}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {b.buildingTag ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          © OpenStreetMap contributors. Not all structures are mapped; use for
          reference only.
        </p>
      </CardContent>
    </Card>
  );
}
