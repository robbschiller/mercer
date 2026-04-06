export function buildGoogleMapsUrl(input: {
  address: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  googlePlaceId?: string | null;
}): string | null {
  const { address, latitude, longitude, googlePlaceId } = input;

  if (googlePlaceId?.trim()) {
    const q = encodeURIComponent(address.trim() || "place");
    return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(googlePlaceId.trim())}`;
  }

  if (latitude != null && longitude != null) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
    }
  }

  return null;
}
