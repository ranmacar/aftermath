import {
  cellToBoundary,
  cellToLatLng,
  getHexagonEdgeLengthAvg,
} from "h3-js";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { H3_RES } from "./h3-overlay";
import { stageFootprints } from "./stages";
import { loadTerrainPatch } from "./terrain";
import { GOOGLE_PHOTOREALISTIC_ASSET, ionToken } from "./cesium-ion";
import { getTilesKey } from "./tiles-key";

const CESIUM_BASE =
  "https://cdn.jsdelivr.net/npm/cesium@1.121.1/Build/Cesium";
const HEX_SOURCE = "hex-focus";
const HEX_FILL = "hex-focus-fill";
const HEX_LINE = "hex-focus-line";

type Cartographic = { longitude: number; latitude: number; height: number };

type CesiumViewer = {
  resize: () => void;
  destroy: () => void;
  useDefaultRenderLoop: boolean;
  camera: {
    lookAt: (target: unknown, offset: unknown) => void;
  };
  entities: {
    removeAll: () => void;
    add: (entity: unknown) => unknown;
  };
  scene: {
    primitives: { add: (primitive: unknown) => unknown };
    requestRender: () => void;
    globe: { show: boolean };
    screenSpaceCameraController: {
      enableInputs: boolean;
      enableRotate: boolean;
      enableZoom: boolean;
      enableTilt: boolean;
      enableLook: boolean;
    };
    sampleHeight?: (pos: Cartographic) => number | undefined;
    sampleHeightMostDetailed?: (positions: Cartographic[]) => Promise<Cartographic[]>;
  };
};

type CesiumNS = {
  Viewer: new (container: HTMLElement, options: Record<string, unknown>) => CesiumViewer;
  Ion: { defaultAccessToken: string };
  Cesium3DTileset: (new (options: Record<string, unknown>) => unknown) & {
    fromUrl: (
      url: string,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
    fromIonAssetId: (
      assetId: number,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
  Cartesian3: {
    new (x: number, y: number, z: number): unknown;
    fromDegrees: (lng: number, lat: number, height?: number) => unknown;
    fromDegreesArray: (coordinates: number[]) => unknown;
    fromDegreesArrayHeights: (coordinates: number[]) => unknown;
  };
  Cartographic: {
    fromDegrees: (lng: number, lat: number, height?: number) => Cartographic;
  };
  HeightReference?: { CLAMP_TO_GROUND: unknown; CLAMP_TO_3D_TILE?: unknown };
  HeadingPitchRange: new (
    heading: number,
    pitch: number,
    range: number,
  ) => unknown;
  Math: { toRadians: (degrees: number) => number; toDegrees: (rad: number) => number };
  Color: {
    fromCssColorString: (css: string) => { withAlpha: (alpha: number) => unknown };
  };
  ClassificationType: { CESIUM_3D_TILE: unknown };
};

declare global {
  interface Window {
    Cesium?: CesiumNS;
  }
}

function apiKey(): string | null {
  return getTilesKey();
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadCesium(): Promise<CesiumNS> {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
    `${CESIUM_BASE}/`;
  if (!document.querySelector(`link[href="${CESIUM_BASE}/Widgets/widgets.css"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${CESIUM_BASE}/Widgets/widgets.css`;
    document.head.appendChild(link);
  }
  return loadScript(`${CESIUM_BASE}/Cesium.js`).then(() => {
    if (!window.Cesium) throw new Error("Cesium failed to initialize");
    return window.Cesium;
  });
}

function hexFeature(cell: string) {
  return {
    type: "Feature" as const,
    properties: { id: cell },
    geometry: {
      type: "Polygon" as const,
      coordinates: [cellToBoundary(cell, true)],
    },
  };
}

function terrainStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Tiles © Esri",
      },
      terrain: {
        type: "raster-dem",
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        ],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
      },
      // Same DEM, separate source: MapLibre renders 3D terrain at reduced
      // quality when hillshade and terrain share one raster-dem source.
      hillshade: {
        type: "raster-dem",
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        ],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
      },
      [HEX_SOURCE]: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
    },
    layers: [
      { id: "satellite", type: "raster", source: "satellite" },
      {
        id: "hills",
        type: "hillshade",
        source: "hillshade",
        paint: { "hillshade-exaggeration": 0.45 },
      },
      {
        // Draped fill, not a 1.2 m fill-extrusion: MapLibre lifts a whole
        // extrusion to the terrain height at its centroid, so on a slope the
        // ~130 m hex became a flat plate floating downhill / buried uphill.
        id: HEX_FILL,
        type: "fill",
        source: HEX_SOURCE,
        paint: {
          "fill-color": "#c6e27a",
          "fill-opacity": 0.45,
        },
      },
      {
        id: HEX_LINE,
        type: "line",
        source: HEX_SOURCE,
        paint: { "line-color": "#e8eedc", "line-width": 2 },
      },
    ],
    terrain: { source: "terrain", exaggeration: 1 },
    sky: {},
  };
}

export function attachView3d(handlers: {
  onWalk?: (cell: string) => void;
  onHabitat?: (cell: string) => void;
  onClose?: () => void;
} = {}): { open(cell: string): void; close(): void; cell(): string | null } {
  const overlayNode = document.getElementById("view3d");
  const canvasNode = document.getElementById("view3d-canvas");
  const labelNode = document.getElementById("view3d-label");
  const errorNode = document.getElementById("view3d-error");
  const closeNode = document.getElementById("view3d-close");
  const walkNode = document.getElementById("view3d-walk");
  const habitatNode = document.getElementById("view3d-habitat");
  if (
    !(overlayNode instanceof HTMLElement) ||
    !(canvasNode instanceof HTMLElement) ||
    !(labelNode instanceof HTMLElement) ||
    !(errorNode instanceof HTMLElement) ||
    !(closeNode instanceof HTMLElement) ||
    !(walkNode instanceof HTMLElement) ||
    !(habitatNode instanceof HTMLElement)
  ) {
    throw new Error("missing 3D view markup");
  }
  const overlay: HTMLElement = overlayNode;
  const canvas: HTMLElement = canvasNode;
  const label: HTMLElement = labelNode;
  const errorEl: HTMLElement = errorNode;
  const closeBtn: HTMLElement = closeNode;
  const walkBtn: HTMLElement = walkNode;
  const habitatBtn: HTMLElement = habitatNode;

  let viewer: CesiumViewer | null = null;
  let tilesetAdded = false;
  let cesium: CesiumNS | null = null;
  let mlMap: maplibregl.Map | null = null;
  let open = false;
  let currentCell: string | null = null;

  function setError(message: string | null): void {
    errorEl.hidden = !message;
    errorEl.textContent = message ?? "";
  }

  /**
   * Ground height per point cluster from the photoreal tiles.
   * Tile hits are the visible surface (tree canopy, roofs), so a single centre
   * sample in a forest put footprints / the hex on top of the trees. Take the
   * lower quartile of a small cluster instead. Clusters with no hit → null.
   */
  async function tileGroundHeights(clusters: [number, number][][]): Promise<(number | null)[]> {
    if (!viewer || !cesium || !viewer.scene.sampleHeightMostDetailed) {
      return clusters.map(() => null);
    }
    const C = cesium;
    const flat = clusters.flat().map(([lo, la]) => C.Cartographic.fromDegrees(lo, la));
    try {
      await viewer.scene.sampleHeightMostDetailed(flat);
    } catch {
      return clusters.map(() => null);
    }
    let k = 0;
    return clusters.map((pts) => {
      const hs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const h = flat[k++]?.height;
        if (typeof h === "number" && Number.isFinite(h)) hs.push(h);
      }
      if (hs.length === 0) return null;
      hs.sort((x, y) => x - y);
      return hs[Math.floor((hs.length - 1) * 0.25)] ?? null;
    });
  }

  /** Centre + `n` points on a circle of `radiusM` (metres) around lng/lat. */
  function cluster(lng: number, lat: number, radiusM: number, n = 6): [number, number][] {
    const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    const pts: [number, number][] = [[lng, lat]];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([
        lng + (radiusM * Math.cos(a)) / (111_111 * cosLat),
        lat + (radiusM * Math.sin(a)) / 111_111,
      ]);
    }
    return pts;
  }

  async function lookAtHex(cell: string): Promise<void> {
    const [lat, lng] = cellToLatLng(cell);
    const zoom = 16.2;
    const pitch = 68;
    const bearing = 18;
    if (mlMap) {
      const source = mlMap.getSource(HEX_SOURCE);
      if (source && source.type === "geojson") {
        (source as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [hexFeature(cell)],
        });
      }
      mlMap.resize();
      mlMap.flyTo({
        center: [lng, lat],
        zoom,
        pitch,
        bearing,
        essential: true,
        duration: 900,
      });
      setStageFootprints(lat, lng);
      return;
    }
    if (!viewer || !cesium) return;
    const ring = cellToBoundary(cell, true);
    const range = getHexagonEdgeLengthAvg(H3_RES, "m") * 6;
    viewer.camera.lookAt(
      cesium.Cartesian3.fromDegrees(lng, lat, 0),
      new cesium.HeadingPitchRange(
        cesium.Math.toRadians(bearing),
        cesium.Math.toRadians(-38),
        range,
      ),
    );
    viewer.scene.requestRender();
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const footprints = stageFootprints().map((fp) => {
      const fLat = lat + fp.z / 111_111;
      const fLng = lng + fp.x / (111_111 * Math.max(cosLat, 0.2));
      return { fp, fLat, fLng };
    });
    const edge = getHexagonEdgeLengthAvg(H3_RES, "m");
    const heights = await tileGroundHeights([
      cluster(lng, lat, edge * 0.35),
      ...footprints.map(({ fp, fLat, fLng }) => cluster(fLng, fLat, fp.radius * 0.6)),
    ]);
    let ground = heights[0] ?? null;
    if (ground === null) {
      const hits = heights.filter((h): h is number => h !== null);
      if (hits.length > 0) ground = Math.min(...hits);
    }
    if (ground === null) {
      // No tile hit at all: DEM fallback. NB terrarium is metres above sea level,
      // Cesium wants ellipsoid height (geoid offset, ~+40–50 m in central Europe).
      const patch = await loadTerrainPatch(cell);
      ground = patch.originHeight;
    }
    viewer.camera.lookAt(
      cesium.Cartesian3.fromDegrees(lng, lat, ground),
      new cesium.HeadingPitchRange(
        cesium.Math.toRadians(bearing),
        cesium.Math.toRadians(-38),
        range,
      ),
    );
    viewer.entities.removeAll();
    // Drape the hex on the tiles (was 6 flat-facet vertices at sampled
    // heights: cut through ridges / floated over valleys and tree tops).
    const flatRing: number[] = [];
    for (const [ringLng, ringLat] of ring) flatRing.push(ringLng, ringLat);
    const first = ring[0];
    if (first) flatRing.push(first[0], first[1]);
    const outline = cesium.Cartesian3.fromDegreesArray(flatRing);
    viewer.entities.add({
      polyline: {
        positions: outline,
        width: 4,
        clampToGround: true,
        classificationType: cesium.ClassificationType.CESIUM_3D_TILE,
        material: cesium.Color.fromCssColorString("#c6e27a"),
      },
    });
    viewer.entities.add({
      polygon: {
        hierarchy: outline,
        classificationType: cesium.ClassificationType.CESIUM_3D_TILE,
        material: cesium.Color.fromCssColorString("#c6e27a").withAlpha(0.28),
      },
    });
    // Each footprint sits on its own ground (Walk places stages at
    // groundAt(stage.x, stage.z)); was the hex-centre height for all of them.
    const C = cesium;
    const v = viewer;
    footprints.forEach(({ fp, fLat, fLng }, i) => {
      const base = heights[i + 1] ?? ground;
      v.entities.add({
        position: C.Cartesian3.fromDegrees(fLng, fLat, base + fp.height / 2),
        cylinder: {
          length: fp.height,
          topRadius: fp.radius * (fp.id === "live-pod" ? 0.35 : 0.85),
          bottomRadius: fp.radius,
          material: C.Color.fromCssColorString(fp.color).withAlpha(0.9),
          outline: true,
          outlineColor: C.Color.fromCssColorString("#e8eedc"),
        },
      });
    });
    viewer.scene.requestRender();
  }

  function setStageFootprints(lat: number, lng: number): void {
    if (!mlMap) return;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const features = stageFootprints().map((fp) => {
      const fLat = lat + fp.z / 111_111;
      const fLng = lng + fp.x / (111_111 * Math.max(cosLat, 0.2));
      const ring: [number, number][] = [];
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        ring.push([
          fLng + (fp.radius * Math.cos(a)) / (111_111 * Math.max(cosLat, 0.2)),
          fLat + (fp.radius * Math.sin(a)) / 111_111,
        ]);
      }
      return {
        type: "Feature" as const,
        properties: { h: fp.height, color: fp.color, id: fp.id },
        geometry: { type: "Polygon" as const, coordinates: [ring] },
      };
    });
    const data = { type: "FeatureCollection" as const, features };
    const source = mlMap.getSource("pod");
    if (source && source.type === "geojson") {
      (source as GeoJSONSource).setData(data);
      return;
    }
    mlMap.addSource("pod", { type: "geojson", data });
    mlMap.addLayer({
      id: "pod-ex",
      type: "fill-extrusion",
      source: "pod",
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "h"],
        "fill-extrusion-opacity": 0.88,
      },
    });
  }

  function ensureMapLibre(cell: string): void {
    if (mlMap) {
      void lookAtHex(cell);
      return;
    }
    const [lat, lng] = cellToLatLng(cell);
    mlMap = new maplibregl.Map({
      container: canvas,
      style: terrainStyle(),
      center: [lng, lat],
      zoom: 16.2,
      pitch: 68,
      bearing: 18,
      maxPitch: 85,
      // Touch: 1 finger pans, 2 fingers pinch-zoom + twist-rotate, 2-finger
      // vertical drag tilts. Defaults, but spelled out so Look always orbits.
      dragPan: true,
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
      attributionControl: { compact: true },
    });
    mlMap.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right",
    );
    mlMap.on("load", () => {
      void lookAtHex(cell);
    });
  }

  async function ensureViewer(): Promise<CesiumNS> {
    cesium = await loadCesium();
    if (!viewer) {
      viewer = new cesium.Viewer(canvas, {
        animation: false,
        baseLayerPicker: false,
        baseLayer: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        requestRenderMode: true,
        creditContainer: document.getElementById("view3d-credits") ?? undefined,
      });
      viewer.scene.globe.show = false;
      // Touch orbit: 1 finger rotates, pinch zooms/twists, 2-finger drag tilts.
      const ssc = viewer.scene.screenSpaceCameraController;
      ssc.enableInputs = true;
      ssc.enableRotate = true;
      ssc.enableZoom = true;
      ssc.enableTilt = true;
      ssc.enableLook = true;
    }
    return cesium;
  }

  async function ensureIon(cell: string): Promise<void> {
    const token = ionToken();
    if (!token) throw new Error("missing Cesium ion token");
    setError(null);
    label.textContent = "Loading photorealistic tiles…";
    const C = await ensureViewer();
    C.Ion.defaultAccessToken = token;
    if (!tilesetAdded && viewer) {
      viewer.scene.primitives.add(
        await C.Cesium3DTileset.fromIonAssetId(GOOGLE_PHOTOREALISTIC_ASSET, {
          showCreditsOnScreen: true,
        }),
      );
      tilesetAdded = true;
    }
    if (!viewer) throw new Error("Cesium viewer missing");
    viewer.useDefaultRenderLoop = true;
    viewer.resize();
    await lookAtHex(cell);
  }

  async function ensureGoogle(cell: string): Promise<void> {
    const key = apiKey();
    if (!key) throw new Error("missing key");
    const probe = await fetch(
      `https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(key)}`,
    );
    if (!probe.ok) {
      throw new Error("Google 3D Tiles key was rejected");
    }
    setError(null);
    label.textContent = "Loading photorealistic tiles…";
    const C = await ensureViewer();
    if (!tilesetAdded && viewer) {
      viewer.scene.primitives.add(
        await C.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(key)}`,
          { showCreditsOnScreen: true },
        ),
      );
      tilesetAdded = true;
    }
    if (!viewer) throw new Error("Cesium viewer missing");
    viewer.useDefaultRenderLoop = true;
    viewer.resize();
    await lookAtHex(cell);
  }

  function hide(): void {
    if (!open) return;
    open = false;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (viewer) viewer.useDefaultRenderLoop = false;
  }

  function close(): void {
    hide();
    handlers.onClose?.();
  }

  async function openCell(cell: string): Promise<void> {
    currentCell = cell;
    open = true;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    label.textContent = `H3 r${H3_RES} · ${cell}`;
    setError(null);
    try {
      if (!mlMap && ionToken()) {
        await ensureIon(cell);
      } else if (apiKey() && !mlMap) {
        await ensureGoogle(cell);
      } else {
        ensureMapLibre(cell);
      }
      if (!open) return;
      label.textContent = `H3 r${H3_RES} · ${cell}`;
    } catch (err) {
      ensureMapLibre(cell);
      setError(
        err instanceof Error
          ? `${err.message} — showing 3D terrain instead.`
          : "Showing 3D terrain instead.",
      );
    }
  }

  closeBtn.addEventListener("click", () => close());
  walkBtn.addEventListener("click", () => {
    if (!currentCell) return;
    hide();
    handlers.onWalk?.(currentCell);
  });
  habitatBtn.addEventListener("click", () => {
    if (!currentCell) return;
    hide();
    handlers.onHabitat?.(currentCell);
  });

  return {
    open: (cell) => void openCell(cell),
    close,
    cell: () => currentCell,
  };
}

if (import.meta.hot) {
  // Accept building-module updates so Walk HMR is not forced into a full remount via Look.
  import.meta.hot.accept(["./stages", "./placements"], () => {
    console.info("[look] stages hot-accepted (footprints refresh on next open)");
  });
}

