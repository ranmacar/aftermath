/**
 * Onshape GLB templates for Walk / Habitat.
 * Sync via `npm run cad:sync` → apps/web/public/models/site/*.glb
 *
 * Two ways the game consumes CAD:
 *  - Assemblies (towers, excavate stage, flat solar): placed whole, parts
 *    merged per game material (part name → material key, see cadMaterialKey).
 *  - Kits (live pod, gantry, agrokruh, crowd): one Onshape part per procedural
 *    primitive, baked and recentred on its bbox so `cadPart(...)` is a drop-in
 *    for the MeshBuilder call it replaces (same origin, same local axes). All
 *    existing transforms / animations / scaling in the game code still apply.
 *
 * Default: CAD when the GLBs load. ?procedural=1 or ?cad=0 forces MeshBuilder.
 * Any missing asset/part falls back to MeshBuilder at the call site.
 */
import type { Scene } from "@babylonjs/core/scene";
import type { Material } from "@babylonjs/core/Materials/material";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/loaders/glTF";

/** Every GLB the Walk / Habitat scenes use (cad/assets.json names). */
export const CAD_ASSETS = [
  "tower_floor",
  "tower_floor_mid",
  "tower_crown_1",
  "tower_crown_3",
  "tower_crown_7",
  "tower_lod",
  "stage_excavate",
  "solar_array",
  "live_pod_kit",
  "gantry_kit",
  "agrokruh_kit",
  "crowd_kit",
] as const;
export type CadAsset = (typeof CAD_ASSETS)[number];

/** Game material keys (subset of stages.ts mats()). */
export type CadMatKey =
  | "floor"
  | "door"
  | "rail"
  | "wall"
  | "glass"
  | "partition"
  | "furni"
  | "corten"
  | "tube"
  | "column"
  | "console"
  | "solar"
  | "solarFrame"
  | "dirt"
  | "facade";

/**
 * Onshape part name → game material, mirroring what the procedural builders
 * assign (Tower.fs / PodAssembly.fs part names).
 */
export function cadMaterialKey(part: string): CadMatKey {
  const n = part.replace(/_primitive\d+$/, "");
  if (/^(Slab|Landing|LOD slab)\b/.test(n)) return "floor";
  if (/^Stair tread/.test(n)) return "door";
  if (/^(Stair rail|Balcony post|Balcony rail|Gate newel)/.test(n)) return "rail";
  if (/^Window glass/.test(n)) return "glass";
  if (/door leaf/i.test(n)) return "door";
  if (/^(Facade|Window frame|Roof infill|Pit wall|Main door frame|Door frame)/.test(n)) return "wall";
  if (
    /^(Corridor wall|Elevator|Core tangent|Bedroom-bath|Living-bedroom|Radial demise|Separator door frame)/.test(
      n,
    )
  )
    return "partition";
  if (/^Bed\b/.test(n)) return "furni";
  if (/^(Pod container|ISO corner)/.test(n)) return "corten";
  if (/^Hatch column/.test(n)) return "tube";
  if (/^LOD column/.test(n)) return "column";
  if (/^(Pod console|Roof console|Tech door)/.test(n)) return "console";
  if (/^Solar disc/.test(n)) return "solar";
  if (/^(Solar rim|Bridge deck|Bridge post)/.test(n)) return "solarFrame";
  if (/^Spoil berm/.test(n)) return "dirt";
  if (/^LOD facade/.test(n)) return "facade";
  return "wall";
}

const containers = new Map<string, AssetContainer>();
const failed = new Set<string>();
/** Baked templates (disabled meshes) keyed `${asset}|${key}` — clones share geometry. */
const templates = new Map<string, Mesh | null>();
let preloadPromise: Promise<void> | null = null;
/** AssetContainers / templates are scene-bound — invalidate when Walk remounts. */
let cachedScene: Scene | null = null;

function cadUrl(name: string): string {
  return `${import.meta.env.BASE_URL}models/site/${name}.glb`;
}

/** Prefer CAD GLBs unless the URL opts out. */
export function useCadGlbs(): boolean {
  if (typeof location === "undefined") return true;
  const p = new URLSearchParams(location.search);
  if (p.get("procedural") === "1" || p.get("cad") === "0") return false;
  return true;
}

export function cadAssetReady(name: string): boolean {
  return useCadGlbs() && containers.has(name);
}

async function loadOne(scene: Scene, name: string): Promise<void> {
  if (containers.has(name) || failed.has(name)) return;
  const url = cadUrl(name);
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) throw new Error(`HTTP ${head.status} for ${url}`);
    const container = await SceneLoader.LoadAssetContainerAsync(url, "", scene);
    container.removeAllFromScene();
    containers.set(name, container);
  } catch (err) {
    failed.add(name);
    console.warn(`[cad-assets] failed to load ${name}`, err);
  }
}

/** Prefetch all Walk / Habitat GLBs (idempotent; shares one in-flight promise). */
export function preloadCadAssets(
  scene: Scene,
  extra: readonly string[] = [],
): Promise<void> {
  if (!useCadGlbs()) return Promise.resolve();
  if (cachedScene !== scene) {
    clearCadAssetCache();
    cachedScene = scene;
  }
  if (!preloadPromise) {
    const names = new Set<string>([...CAD_ASSETS, ...extra]);
    preloadPromise = Promise.all([...names].map((n) => loadOne(scene, n))).then(
      () => {
        const ok = [...names].filter((n) => containers.has(n));
        const bad = [...names].filter((n) => failed.has(n));
        console.info(
          `[cad-assets] ready ${ok.length}/${names.size}` +
            (bad.length ? ` (missing: ${bad.join(", ")})` : ""),
        );
      },
    );
  }
  return preloadPromise;
}

/** Drop cached containers + templates (HMR / scene change). */
export function clearCadAssetCache(): void {
  for (const t of templates.values()) {
    try {
      t?.dispose(false, false);
    } catch {
      /* scene may already be disposed */
    }
  }
  templates.clear();
  for (const c of containers.values()) {
    try {
      c.dispose();
    } catch {
      /* scene may already be disposed */
    }
  }
  containers.clear();
  failed.clear();
  preloadPromise = null;
  cachedScene = null;
}

function partName(mesh: AbstractMesh): string {
  // glTF loader names multi-primitive children `${node}_primitiveN`.
  return mesh.name.replace(/_primitive\d+$/, "");
}

/**
 * Bake meshes into one vertex buffer in the loader's world space (Babylon
 * axes; dequantisation + glTF handedness flip folded in). Optional recentre
 * on the bbox centre so kit parts match MeshBuilder origins.
 */
function bake(meshes: AbstractMesh[], recenter: boolean): VertexData | null {
  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  const p = new Vector3();
  const n = new Vector3();
  const nm = new Matrix();
  for (const mesh of meshes) {
    const src = mesh as Mesh;
    const P = src.getVerticesData?.(VertexBuffer.PositionKind);
    if (!P || P.length === 0) continue;
    const N = src.getVerticesData?.(VertexBuffer.NormalKind) ?? null;
    const I = src.getIndices?.() ?? null;
    const wm = mesh.computeWorldMatrix(true);
    wm.invertToRef(nm);
    nm.transposeToRef(nm);
    // glTF is CCW-front (cross(b−a, c−a) along +normal); Babylon's MeshBuilder
    // convention is the opposite. The loader's mirrored __root__ (det < 0)
    // already reverses it, so only swap when the baked transform is not mirrored.
    const flip = wm.determinant() > 0;
    const base = pos.length / 3;
    const count = P.length / 3;
    for (let i = 0; i < count; i++) {
      Vector3.TransformCoordinatesFromFloatsToRef(P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!, wm, p);
      pos.push(p.x, p.y, p.z);
      if (N) {
        Vector3.TransformNormalFromFloatsToRef(N[i * 3]!, N[i * 3 + 1]!, N[i * 3 + 2]!, nm, n);
        n.normalize();
        nrm.push(n.x, n.y, n.z);
      }
    }
    const tri = I ? I.length : count;
    for (let t = 0; t + 2 < tri; t += 3) {
      const a = base + (I ? I[t]! : t);
      const b = base + (I ? I[t + 1]! : t + 1);
      const c = base + (I ? I[t + 2]! : t + 2);
      if (flip) idx.push(a, c, b);
      else idx.push(a, b, c);
    }
    if (!N) {
      // Rare (no normals in GLB): fill later via ComputeNormals.
      for (let i = 0; i < count; i++) nrm.push(0, 0, 0);
    }
  }
  if (pos.length === 0) return null;
  if (recenter) {
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i++) {
      const k = i % 3;
      if (pos[i]! < mn[k]!) mn[k] = pos[i]!;
      if (pos[i]! > mx[k]!) mx[k] = pos[i]!;
    }
    const c = [0, 1, 2].map((k) => (mn[k]! + mx[k]!) / 2);
    for (let i = 0; i < pos.length; i++) pos[i] = pos[i]! - c[i % 3]!;
  }
  const vd = new VertexData();
  vd.positions = pos;
  vd.indices = idx;
  if (nrm.every((v) => v === 0)) {
    const computed: number[] = [];
    VertexData.ComputeNormals(pos, idx, computed);
    vd.normals = computed;
  } else {
    vd.normals = nrm;
  }
  return vd;
}

function template(
  asset: string,
  key: string,
  select: (part: string) => boolean,
  recenter: boolean,
): Mesh | null {
  const tkey = `${asset}|${key}`;
  if (templates.has(tkey)) return templates.get(tkey)!;
  const container = containers.get(asset);
  if (!container || !cachedScene) return null;
  const meshes = container.meshes.filter(
    (mm) => mm.getTotalVertices() > 0 && select(partName(mm)),
  );
  const vd = meshes.length ? bake(meshes, recenter) : null;
  let tpl: Mesh | null = null;
  if (vd) {
    tpl = new Mesh(`cad-tpl-${tkey}`, cachedScene);
    vd.applyToMesh(tpl, false);
    tpl.setEnabled(false);
    tpl.isPickable = false;
    tpl.checkCollisions = false;
  }
  templates.set(tkey, tpl);
  return tpl;
}

function cloneTemplate(tpl: Mesh, name: string, parent: TransformNode | null): Mesh {
  const c = tpl.clone(name, parent, true);
  c.setEnabled(true);
  c.isVisible = true;
  c.isPickable = false;
  c.checkCollisions = false;
  c.position.setAll(0);
  c.rotation.setAll(0);
  c.scaling.setAll(1);
  return c;
}

/**
 * Kit drop-in: a fresh mesh of Onshape part `part` from `asset`, centred on
 * its bbox (same origin as the MeshBuilder primitive it replaces). Unparented,
 * no material. Returns null when CAD is off or the part is missing.
 */
export function cadPart(asset: CadAsset, part: string, name: string): Mesh | null {
  if (!cadAssetReady(asset)) return null;
  const tpl = template(asset, `part:${part}`, (p) => p === part, true);
  return tpl ? cloneTemplate(tpl, name, null) : null;
}

export type PlaceAssemblyOpts = {
  /** Local Y of the asset origin (metres). */
  y?: number;
  /** Babylon rotation.y (radians). Plan angle a maps to a − rotY. */
  rotY?: number;
  name?: string;
};

/**
 * Place a whole CAD assembly under `parent`: one merged mesh per game material.
 * Returns the wrapper node, or null when CAD is off / the asset is missing.
 */
export function placeCadAssembly(
  asset: CadAsset,
  parent: TransformNode,
  mats: Partial<Record<CadMatKey, Material>>,
  opts: PlaceAssemblyOpts = {},
): TransformNode | null {
  if (!cadAssetReady(asset)) return null;
  const container = containers.get(asset)!;
  const keys = new Set<CadMatKey>();
  for (const mm of container.meshes) {
    if (mm.getTotalVertices() > 0) keys.add(cadMaterialKey(partName(mm)));
  }
  if (keys.size === 0) return null;
  const wrap = new TransformNode(opts.name ?? `cad-${asset}`, parent.getScene());
  wrap.parent = parent;
  wrap.position.y = opts.y ?? 0;
  wrap.rotation.y = opts.rotY ?? 0;
  for (const key of keys) {
    const tpl = template(asset, `mat:${key}`, (p) => cadMaterialKey(p) === key, false);
    if (!tpl) continue;
    const mesh = cloneTemplate(tpl, `${wrap.name}-${key}`, wrap);
    mesh.material = mats[key] ?? mats.wall ?? null;
  }
  return wrap;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearCadAssetCache();
  });
}
