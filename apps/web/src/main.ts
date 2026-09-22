import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { H3_RES, attachH3Overlay } from "./h3-overlay";
import { attachView3d } from "./view3d";
import { attachWalk } from "./walk";
import { attachDigout } from "./digout";
import "./style.css";
import { ensureTilesUnlock } from "./unlock";

type Mode = "map" | "look" | "walk" | "habitat";

const MODE_KEY = "aftermath:ui-mode";

type SavedUi = { mode: Mode; cell: string | null };

function readUi(): SavedUi | null {
  try {
    const raw = sessionStorage.getItem(MODE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("mode" in parsed) ||
      !("cell" in parsed)
    ) {
      return null;
    }
    const mode = (parsed as { mode: unknown }).mode;
    const cell = (parsed as { cell: unknown }).cell;
    if (
      mode !== "map" &&
      mode !== "look" &&
      mode !== "walk" &&
      mode !== "habitat"
    ) {
      return null;
    }
    if (cell !== null && typeof cell !== "string") return null;
    return { mode, cell };
  } catch {
    return null;
  }
}

function writeUi(next: Mode, cell: string | null): void {
  try {
    const payload: SavedUi = { mode: next, cell };
    sessionStorage.setItem(MODE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}


const LAST_KEY = "aftermath:last-loc";
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type LngLat = { lng: number; lat: number };

const statusNode = document.getElementById("status");
if (!(statusNode instanceof HTMLElement)) {
  throw new Error("missing #status");
}
const statusEl: HTMLElement = statusNode;

const cellNode = document.getElementById("cell");
if (!(cellNode instanceof HTMLElement)) {
  throw new Error("missing #cell");
}
const cellEl: HTMLElement = cellNode;

function setCellLabel(id: string | null, reason: "zoom" | "here" | "select"): void {
  if (reason === "zoom" || !id) {
    cellEl.textContent = `Zoom in · H3 r${H3_RES}`;
    return;
  }
  cellEl.textContent = `${reason === "select" ? "cell" : "here"} · r${H3_RES} · ${id}`;
}

function setStatus(text: string, kind: "info" | "ok" | "err" = "info"): void {
  statusEl.hidden = text.length === 0;
  statusEl.dataset.kind = kind;
  statusEl.textContent = text;
}

function readLast(): LngLat | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "lng" in parsed &&
      "lat" in parsed &&
      typeof parsed.lng === "number" &&
      typeof parsed.lat === "number"
    ) {
      return { lng: parsed.lng, lat: parsed.lat };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveLast(coord: LngLat): void {
  localStorage.setItem(LAST_KEY, JSON.stringify(coord));
}

async function termuxLocation(): Promise<LngLat | null> {
  try {
    const res = await fetch("/api/location");
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      "latitude" in data &&
      "longitude" in data &&
      typeof data.latitude === "number" &&
      typeof data.longitude === "number"
    ) {
      return { lng: data.longitude, lat: data.latitude };
    }
  } catch {
    /* ignore */
  }
  return null;
}

const last = readLast();

await ensureTilesUnlock();

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  center: last ? [last.lng, last.lat] : [10, 51],
  zoom: last ? 14 : 3.2,
  attributionControl: { compact: true },
});

map.addControl(
  new maplibregl.NavigationControl({ visualizePitch: true }),
  "bottom-right",
);

const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true, timeout: 12_000 },
  fitBoundsOptions: { maxZoom: 16 },
  trackUserLocation: true,
  showUserLocation: true,
  showAccuracyCircle: true,
});
map.addControl(geolocate, "bottom-right");

const modeMapNode = document.getElementById("mode-map");
const modeLookNode = document.getElementById("mode-look");
const modeWalkNode = document.getElementById("mode-walk");
const modeHabitatNode = document.getElementById("mode-habitat");
if (
  !(modeMapNode instanceof HTMLButtonElement) ||
  !(modeLookNode instanceof HTMLButtonElement) ||
  !(modeWalkNode instanceof HTMLButtonElement) ||
  !(modeHabitatNode instanceof HTMLButtonElement)
) {
  throw new Error("missing mode buttons");
}
const modeMap: HTMLButtonElement = modeMapNode;
const modeLook: HTMLButtonElement = modeLookNode;
const modeWalk: HTMLButtonElement = modeWalkNode;
const modeHabitat: HTMLButtonElement = modeHabitatNode;

let mode: Mode = "map";
let selectedCell: string | null = null;

function setMode(next: Mode): void {
  mode = next;
  modeMap.classList.toggle("is-on", next === "map");
  modeLook.classList.toggle("is-on", next === "look");
  modeWalk.classList.toggle("is-on", next === "walk");
  modeHabitat.classList.toggle("is-on", next === "habitat");
  writeUi(next, selectedCell);
}

function goMap(): void {
  walk.close();
  view3d.close();
  setMode("map");
}

function goLook(cell: string): void {
  selectedCell = cell;
  modeLook.disabled = false;
  modeWalk.disabled = false;
  modeHabitat.disabled = false;
  walk.close();
  setMode("look");
  view3d.open(cell);
}

function goWalk(cell: string): void {
  selectedCell = cell;
  modeLook.disabled = false;
  modeWalk.disabled = false;
  modeHabitat.disabled = false;
  view3d.close();
  setMode("walk");
  walk.open(cell, "stages");
}

function goHabitat(cell: string): void {
  selectedCell = cell;
  modeLook.disabled = false;
  modeWalk.disabled = false;
  modeHabitat.disabled = false;
  view3d.close();
  setMode("habitat");
  walk.open(cell, "habitat");
}

const walk = attachWalk({
  onLook: () => {
    if (selectedCell) goLook(selectedCell);
    else goMap();
  },
  onMap: () => goMap(),
});

const view3d = attachView3d({
  onWalk: (cell) => goWalk(cell),
  onHabitat: (cell) => goHabitat(cell),
  onClose: () => setMode("map"),
});

const h3 = attachH3Overlay(map, {
  onFocus: setCellLabel,
  onSelect: (cell) => goLook(cell),
});

modeMap.addEventListener("click", () => goMap());
modeLook.addEventListener("click", () => {
  if (selectedCell) goLook(selectedCell);
});
modeWalk.addEventListener("click", () => {
  if (selectedCell) goWalk(selectedCell);
});
modeHabitat.addEventListener("click", () => {
  if (selectedCell) goHabitat(selectedCell);
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (mode === "walk" || mode === "habitat") {
    if (selectedCell) goLook(selectedCell);
    else goMap();
    return;
  }
  if (mode === "look") goMap();
});
if (last) h3.setHere(last);

let usedFallback = false;
let locateInFlight = false;

function flyTo(coord: LngLat, message: string): void {
  saveLast(coord);
  h3.setHere(coord);
  map.flyTo({ center: [coord.lng, coord.lat], zoom: 15, essential: true });
  setStatus(message, "ok");
}

function applyPosition(coord: LngLat, message: string): void {
  flyTo(coord, message);
}

async function fallbackLocation(): Promise<void> {
  if (usedFallback) return;
  usedFallback = true;
  const termux = await termuxLocation();
  if (termux) {
    applyPosition(termux, "Location from Termux");
    return;
  }
  const cached = readLast();
  if (cached) {
    applyPosition(cached, "Using last location — tap the locate control to refresh");
    return;
  }
  setStatus("Location unavailable — pan the map or tap locate", "err");
}

/** Fresh GPS after Beat 1 / cold start. Resizes map first (overlay was covering it). */
async function locateUser(reason: "start" | "after-digout"): Promise<void> {
  if (locateInFlight) return;
  locateInFlight = true;
  usedFallback = false;
  setStatus("Finding your location…");
  map.resize();

  const fromBrowser = (): Promise<LngLat | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
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
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
      );
    });

  try {
    // Let layout settle after digout overlay closes.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    map.resize();

    const coord = await fromBrowser();
    if (coord) {
      applyPosition(
        coord,
        reason === "after-digout"
          ? "You're here — follow the pod signal, pick a hex"
          : "You're here",
      );
      try {
        geolocate.trigger();
      } catch {
        /* control may already be tracking */
      }
      return;
    }

    try {
      geolocate.trigger();
    } catch {
      await fallbackLocation();
    }
  } finally {
    locateInFlight = false;
  }
}

function beginMap(reason: "start" | "after-digout" = "start"): void {
  void locateUser(reason);
}

const digout = attachDigout({
  onComplete: () => {
    beginMap("after-digout");
  },
});

map.on("load", () => {
  map.resize();
  const saved = readUi();
  // Building-design HMR / refresh: stay in Walk (or Look) instead of dropping to Map.
  if (saved?.mode === "walk" && saved.cell) {
    goWalk(saved.cell);
    return;
  }
  if (saved?.mode === "habitat" && saved.cell) {
    goHabitat(saved.cell);
    return;
  }
  if (!digout.start()) {
    if (saved?.mode === "look" && saved.cell) {
      goLook(saved.cell);
    } else {
      beginMap("start");
    }
  }
});

geolocate.on("geolocate", (position: GeolocationPosition) => {
  const coord = {
    lng: position.coords.longitude,
    lat: position.coords.latitude,
  };
  applyPosition(coord, "You're here");
});

geolocate.on("error", () => {
  void fallbackLocation();
});

window.visualViewport?.addEventListener("resize", () => map.resize());
window.addEventListener("orientationchange", () => map.resize());

// Keep app shell alive across Walk/Look/building HMR — mode lives in sessionStorage.
if (import.meta.hot) {
  // Do NOT accept ./stages here — walk.ts rebuilds the strip in place.
  // Accepting stages from main would remount Walk and flash Map.
  import.meta.hot.accept(["./walk", "./view3d"], () => {
    const saved = readUi();
    if (saved?.mode === "walk" && saved.cell) {
      goWalk(saved.cell);
    } else if (saved?.mode === "habitat" && saved.cell) {
      goHabitat(saved.cell);
    } else if (saved?.mode === "look" && saved.cell) {
      goLook(saved.cell);
    }
  });
}
