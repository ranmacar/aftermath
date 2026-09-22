export type LngLat = { lng: number; lat: number };

function browserPosition(
  highAccuracy: boolean,
  timeout: number,
  maximumAge: number,
): Promise<LngLat | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge },
    );
  });
}

async function browserThenCoarse(): Promise<LngLat | null> {
  const fine = await browserPosition(true, 8_000, 0);
  if (fine) return fine;
  return browserPosition(false, 15_000, 120_000);
}

let primed: Promise<LngLat | null> | null = null;

/** Start GPS during a click. Page-load calls are ignored on many mobile browsers. */
export function primeGeolocation(): void {
  if (primed) return;
  primed = browserThenCoarse();
}

export function takeBrowserPosition(): Promise<LngLat | null> {
  if (!primed) primed = browserThenCoarse();
  return primed;
}

/** City-level fix when the browser will not share GPS. */
export async function networkLocation(): Promise<LngLat | null> {
  try {
    const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return null;
    const latitude = Number((data as { latitude?: unknown }).latitude);
    const longitude = Number((data as { longitude?: unknown }).longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { lng: longitude, lat: latitude };
  } catch {
    return null;
  }
}
