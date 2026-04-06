import { NextRequest, NextResponse } from "next/server";

const MIN_ZOOM = 15;
const MAX_ZOOM = 20;
const DEFAULT_ZOOM = 18;
const MAX_WIDTH = 640;
const MAX_HEIGHT = 640;
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

function parseFinite(param: string | null): number | null {
  if (param == null || param === "") return null;
  const n = Number(param);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  const key = process.env.GOOGLE_MAPS_STATIC_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Satellite maps are not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFinite(searchParams.get("lat"));
  const lng = parseFinite(searchParams.get("lng"));

  if (lat == null || lng == null) {
    return NextResponse.json(
      { error: "Missing or invalid lat/lng" },
      { status: 400 }
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "lat/lng out of range" }, { status: 400 });
  }

  let zoom = parseFinite(searchParams.get("zoom")) ?? DEFAULT_ZOOM;
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));

  let width = parseFinite(searchParams.get("w")) ?? DEFAULT_WIDTH;
  let height = parseFinite(searchParams.get("h")) ?? DEFAULT_HEIGHT;
  width = Math.min(MAX_WIDTH, Math.max(1, Math.round(width)));
  height = Math.min(MAX_HEIGHT, Math.max(1, Math.round(height)));

  const staticUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  staticUrl.searchParams.set("center", `${lat},${lng}`);
  staticUrl.searchParams.set("zoom", String(zoom));
  staticUrl.searchParams.set("size", `${width}x${height}`);
  staticUrl.searchParams.set("maptype", "satellite");
  staticUrl.searchParams.set("key", key);

  const upstream = await fetch(staticUrl.toString(), {
    next: { revalidate: 86400 },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    console.error("[satellite] Static API error:", upstream.status, text.slice(0, 500));
    return NextResponse.json(
      { error: "Could not load satellite image" },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
