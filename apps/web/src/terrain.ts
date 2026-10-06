import { cellOrigin } from "./geo";

const EARTH_M = 6_378_137;
const DEM_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const SAT_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export type TerrainPatch = {
  size: number;
  cells: number;
  originHeight: number;
  heights: Float32Array;
  texture: HTMLCanvasElement | null;
};

const cache = new Map<string, Promise<TerrainPatch>>();

function tileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * 2 ** z;
}

function tileY(lat: number, z: number): number {
  const s = Math.sin((lat * Math.PI) / 180);
  return (
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z
  );
}

function latLngFromEnu(
  originLat: number,
  originLng: number,
  x: number,
  z: number,
): { lat: number; lng: number } {
  const lat = originLat + (z / EARTH_M) * (180 / Math.PI);
  const lng =
    originLng +
    (x / (EARTH_M * Math.cos((originLat * Math.PI) / 180))) * (180 / Math.PI);
  return { lat, lng };
}

async function loadImage(url: string, attempts = 2): Promise<HTMLImageElement | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) {
        // 404 = no tile; only retry transient failures.
        if (res.status === 404) return null;
        continue;
      }
      const blob = await res.blob();
      const src = URL.createObjectURL(blob);
      try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error(url));
          el.src = src;
        });
      } finally {
        URL.revokeObjectURL(src);
      }
    } catch {
      /* network error — retry once */
    }
  }
  return null;
}

function terrariumMeters(data: Uint8ClampedArray, idx: number): number {
  const r = data[idx] ?? 0;
  const g = data[idx + 1] ?? 0;
  const b = data[idx + 2] ?? 0;
  return r * 256 + g + b / 256 - 32768;
}

type Raster = {
  z: number;
  x: number;
  y: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Decoded lazily, once; per-sample getImageData was 4k+ readbacks per patch. */
  pixels: Uint8ClampedArray | null;
};

async function loadTileGrid(
  urlTemplate: string,
  z: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<Map<string, Raster>> {
  const out = new Map<string, Raster>();
  const jobs: Promise<void>[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const url = urlTemplate
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(y));
      jobs.push(
        loadImage(url).then((img) => {
          if (!img) return;
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          out.set(`${z}/${x}/${y}`, { z, x, y, canvas, ctx, pixels: null });
        }),
      );
    }
  }
  await Promise.all(jobs);
  return out;
}

/** One DEM pixel addressed in global (world) pixel space at zoom `z`. */
function terrariumPixel(
  tiles: Map<string, Raster>,
  z: number,
  gx: number,
  gy: number,
  tileSize: number,
): number | null {
  const tx = Math.floor(gx / tileSize);
  const ty = Math.floor(gy / tileSize);
  const tile = tiles.get(`${z}/${tx}/${ty}`);
  if (!tile) return null;
  const ix = gx - tx * tileSize;
  const iy = gy - ty * tileSize;
  tile.pixels ??= tile.ctx.getImageData(0, 0, tile.canvas.width, tile.canvas.height).data;
  const h = terrariumMeters(tile.pixels, (iy * tile.canvas.width + ix) * 4);
  // Terrarium has no explicit nodata; guard against corrupt / blank pixels.
  return Number.isFinite(h) && h > -12_000 && h < 9_000 ? h : null;
}

/**
 * Bilinear DEM sample. Nearest-pixel sampling (old) terraced steep slopes:
 * z15 pixels are ~3–5 m, the Walk grid is 2.8 m, so neighbouring vertices
 * snapped to the same or skipped pixels (up to ~5 m steps on alpine slopes).
 * Works across tile seams in global pixel space (pixel centres at +0.5).
 */
function sampleTerrarium(
  tiles: Map<string, Raster>,
  z: number,
  lat: number,
  lng: number,
  tileSize = 256,
): number | null {
  const gx = tileX(lng, z) * tileSize - 0.5;
  const gy = tileY(lat, z) * tileSize - 0.5;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const h00 = terrariumPixel(tiles, z, x0, y0, tileSize);
  const h10 = terrariumPixel(tiles, z, x0 + 1, y0, tileSize);
  const h01 = terrariumPixel(tiles, z, x0, y0 + 1, tileSize);
  const h11 = terrariumPixel(tiles, z, x0 + 1, y0 + 1, tileSize);
  const w = [
    [h00, (1 - fx) * (1 - fy)],
    [h10, fx * (1 - fy)],
    [h01, (1 - fx) * fy],
    [h11, fx * fy],
  ] as const;
  let sum = 0;
  let wsum = 0;
  for (const [h, wt] of w) {
    if (h === null) continue;
    sum += h * wt;
    wsum += wt;
  }
  // Missing neighbour tile: renormalise over the pixels we do have.
  return wsum > 1e-6 ? sum / wsum : null;
}

/** Fill grid holes (missing DEM tile / bad pixels) from nearest valid samples. */
function fillHoles(heights: Float32Array, valid: Uint8Array, cells: number): boolean {
  let any = false;
  for (let i = 0; i < valid.length; i++) {
    if (valid[i]) {
      any = true;
      break;
    }
  }
  if (!any) return false;
  // Iterative dilation: each pass fills holes adjacent to valid cells.
  let pending = true;
  while (pending) {
    pending = false;
    const next = valid.slice();
    for (let iz = 0; iz < cells; iz++) {
      for (let ix = 0; ix < cells; ix++) {
        const i = iz * cells + ix;
        if (valid[i]) continue;
        let sum = 0;
        let n = 0;
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const jx = ix + dx;
          const jz = iz + dz;
          if (jx < 0 || jz < 0 || jx >= cells || jz >= cells) continue;
          const j = jz * cells + jx;
          if (!valid[j]) continue;
          sum += heights[j] ?? 0;
          n++;
        }
        if (n > 0) {
          heights[i] = sum / n;
          next[i] = 1;
        } else {
          pending = true;
        }
      }
    }
    valid.set(next);
  }
  return true;
}

export function samplePatch(patch: TerrainPatch, x: number, z: number): number {
  const { size, cells, heights } = patch;
  const u = ((x + size / 2) / size) * (cells - 1);
  const v = ((z + size / 2) / size) * (cells - 1);
  const x0 = Math.max(0, Math.min(cells - 2, Math.floor(u)));
  const z0 = Math.max(0, Math.min(cells - 2, Math.floor(v)));
  // Clamp: outside the patch hold the edge height instead of extrapolating
  // the edge slope (player / fly-out past the edge shot up or down).
  const tx = Math.min(1, Math.max(0, u - x0));
  const tz = Math.min(1, Math.max(0, v - z0));
  const h00 = heights[z0 * cells + x0] ?? 0;
  const h10 = heights[z0 * cells + x0 + 1] ?? h00;
  const h01 = heights[(z0 + 1) * cells + x0] ?? h00;
  const h11 = heights[(z0 + 1) * cells + x0 + 1] ?? h00;
  return h00 * (1 - tx) * (1 - tz) + h10 * tx * (1 - tz) + h01 * (1 - tx) * tz + h11 * tx * tz;
}

export async function loadTerrainPatch(
  cell: string,
  size = 180,
  cells = 65,
): Promise<TerrainPatch> {
  const cacheKey = `${cell}:${size}:${cells}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const job = (async () => {
    const origin = cellOrigin(cell);
    const zDem = 15;
    const zSat = 17;
    const corners = [
      latLngFromEnu(origin.lat, origin.lng, -size / 2, -size / 2),
      latLngFromEnu(origin.lat, origin.lng, size / 2, -size / 2),
      latLngFromEnu(origin.lat, origin.lng, -size / 2, size / 2),
      latLngFromEnu(origin.lat, origin.lng, size / 2, size / 2),
    ];
    // Pad by one pixel so bilinear taps at the patch edge have their neighbour tile.
    const pad = 1 / 256;
    const xs = corners.map((c) => tileX(c.lng, zDem));
    const ys = corners.map((c) => tileY(c.lat, zDem));
    const demTiles = await loadTileGrid(
      DEM_URL,
      zDem,
      Math.floor(Math.min(...xs) - pad),
      Math.floor(Math.min(...ys) - pad),
      Math.floor(Math.max(...xs) + pad),
      Math.floor(Math.max(...ys) + pad),
    );

    const heights = new Float32Array(cells * cells);
    const valid = new Uint8Array(cells * cells);
    for (let iz = 0; iz < cells; iz++) {
      for (let ix = 0; ix < cells; ix++) {
        const x = -size / 2 + (ix / (cells - 1)) * size;
        const z = -size / 2 + (iz / (cells - 1)) * size;
        const ll = latLngFromEnu(origin.lat, origin.lng, x, z);
        const h = sampleTerrarium(demTiles, zDem, ll.lat, ll.lng);
        if (h !== null) {
          heights[iz * cells + ix] = h;
          valid[iz * cells + ix] = 1;
        }
      }
    }
    // A failed tile used to read as 0 m → a cliff of -originHeight. Fill from
    // neighbours instead; an all-missing patch stays flat at 0.
    const demOk = fillHoles(heights, valid, cells);
    if (!demOk) {
      heights.fill(0);
      // Don't pin a flat placeholder for the whole session — retry next open.
      cache.delete(cacheKey);
    }
    const mid = Math.floor(cells / 2);
    const originHeight = heights[mid * cells + mid] ?? 0;
    for (let i = 0; i < heights.length; i++) heights[i] -= originHeight;

    let texture: HTMLCanvasElement | null = null;
    try {
      const sw = latLngFromEnu(origin.lat, origin.lng, -size / 2, -size / 2);
      const ne = latLngFromEnu(origin.lat, origin.lng, size / 2, size / 2);
      const west = tileX(sw.lng, zSat);
      const east = tileX(ne.lng, zSat);
      const north = tileY(ne.lat, zSat);
      const south = tileY(sw.lat, zSat);
      const satTiles = await loadTileGrid(
        SAT_URL,
        zSat,
        Math.floor(Math.min(west, east)),
        Math.floor(Math.min(north, south)),
        Math.floor(Math.max(west, east)),
        Math.floor(Math.max(north, south)),
      );
      if (satTiles.size > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const spanX = east - west || 1;
          const spanY = south - north || 1;
          for (const tile of satTiles.values()) {
            const dx = ((tile.x - west) / spanX) * canvas.width;
            const dy = ((tile.y - north) / spanY) * canvas.height;
            const dw = canvas.width / spanX;
            const dh = canvas.height / spanY;
            ctx.drawImage(tile.canvas, dx, dy, dw, dh);
          }
          texture = canvas;
        }
      }
    } catch {
      texture = null;
    }

    return { size, cells, originHeight, heights, texture };
  })();
  cache.set(cacheKey, job);
  return job;
}
