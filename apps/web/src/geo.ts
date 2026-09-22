import { cellToBoundary, cellToLatLng, gridDisk } from "h3-js";

const EARTH_M = 6_378_137;

export type Enu = { x: number; y: number; z: number };

export function cellOrigin(cell: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(cell);
  return { lat, lng };
}

/** Local meters: +x east, +y up, +z north. */
export function lngLatToEnu(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number,
): Enu {
  const dLat = ((lat - originLat) * Math.PI) / 180;
  const dLng = ((lng - originLng) * Math.PI) / 180;
  const z = dLat * EARTH_M;
  const x = dLng * EARTH_M * Math.cos((originLat * Math.PI) / 180);
  return { x, y: 0, z };
}

/** Focus-cell hex outline in ENU (center at origin). */
export function hexRingEnu(cell: string): Enu[] {
  return hexRingEnuRelative(cell, cell);
}

/** Hex outline of `cell` in ENU relative to `originCell` center. */
export function hexRingEnuRelative(cell: string, originCell: string): Enu[] {
  const origin = cellOrigin(originCell);
  return cellToBoundary(cell, true).map(([lng, lat]) =>
    lngLatToEnu(lat, lng, origin.lat, origin.lng),
  );
}

/** Six H3 neighbors of `cell` (excludes self). */
export function neighborCells(cell: string): string[] {
  return gridDisk(cell, 1).filter((id) => id !== cell);
}

/** Center of `cell` in ENU meters relative to `originCell`. */
export function cellCenterEnu(
  cell: string,
  originCell: string,
): { x: number; z: number } {
  const o = cellOrigin(originCell);
  const c = cellOrigin(cell);
  const e = lngLatToEnu(c.lat, c.lng, o.lat, o.lng);
  return { x: e.x, z: e.z };
}

/** Focus cell + six neighbors. */
export function habitatClusterCells(focus: string): string[] {
  return [focus, ...neighborCells(focus)];
}
