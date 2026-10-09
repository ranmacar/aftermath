/**
 * Standalone Onshape GLB preview. Open /cad-preview.html?asset=tower
 * Default gameplay (Walk) is unchanged.
 */
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color4,
  Tools,
} from "@babylonjs/core";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";

const ASSETS = [
  "pod_container_40hc",
  "solar_array",
  "floor_slab",
  "elevator_shaft",
  "floor_walls",
  "exterior_stair",
  "agrokruh_bed",
  "pod_assembly",
  "tower_floor",
  "tower",
] as const;

const canvas = document.getElementById("c");
const select = document.getElementById("asset");
const hud = document.getElementById("hud");
const reloadBtn = document.getElementById("reload");
if (
  !(canvas instanceof HTMLCanvasElement) ||
  !(select instanceof HTMLSelectElement) ||
  !(hud instanceof HTMLElement) ||
  !(reloadBtn instanceof HTMLButtonElement)
) {
  throw new Error("cad-preview: missing DOM");
}
const canvasEl: HTMLCanvasElement = canvas;
const selectEl: HTMLSelectElement = select;
const hudEl: HTMLElement = hud;
const reloadEl: HTMLButtonElement = reloadBtn;

for (const name of ASSETS) {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  selectEl.appendChild(opt);
}

const params = new URLSearchParams(location.search);
const initial = params.get("asset") ?? "pod_container_40hc";
if ((ASSETS as readonly string[]).includes(initial)) selectEl.value = initial;

const engine = new Engine(canvasEl, true, {
  preserveDrawingBuffer: true,
  stencil: true,
});
const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.1, 0.07, 1);
new HemisphericLight("hemi", new Vector3(0.3, 1, 0.2), scene);
const camera = new ArcRotateCamera(
  "cam",
  -Math.PI / 3,
  Math.PI / 3,
  30,
  Vector3.Zero(),
  scene,
);
camera.attachControl(canvasEl, true);
camera.wheelPrecision = 20;
camera.lowerRadiusLimit = 1;
camera.upperRadiusLimit = 200;

let loadedRootNames = new Set<string>();

async function load(name: string): Promise<void> {
  hudEl.textContent = `Loading ${name}…`;
  for (const m of [...scene.meshes]) {
    if (loadedRootNames.has(m.name) || m.name.startsWith("CAD:")) {
      m.dispose(false, true);
    }
  }
  loadedRootNames = new Set();

  const url = `${import.meta.env.BASE_URL}models/site/${name}.glb`;
  const t0 = performance.now();
  try {
    const head = await fetch(url);
    if (!head.ok) throw new Error(`HTTP ${head.status} for ${url}`);
    const kb = Number(head.headers.get("content-length") ?? 0) / 1024;
    const result = await SceneLoader.ImportMeshAsync("", url, "", scene);
    for (const m of result.meshes) {
      loadedRootNames.add(m.name);
      m.name = `CAD:${m.name || "mesh"}`;
    }
    let min = new Vector3(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    );
    let max = new Vector3(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    );
    let tris = 0;
    for (const m of result.meshes) {
      if (!m.getTotalVertices?.()) continue;
      const bi = m.getBoundingInfo();
      min = Vector3.Minimize(min, bi.boundingBox.minimumWorld);
      max = Vector3.Maximize(max, bi.boundingBox.maximumWorld);
      const idx = m.getIndices();
      if (idx) tris += idx.length / 3;
    }
    const center = min.add(max).scale(0.5);
    const size = max.subtract(min);
    const radius = Math.max(size.x, size.y, size.z, 1) * 1.4;
    camera.setTarget(center);
    camera.radius = radius;
    const ms = Math.round(performance.now() - t0);
    const sizeLabel = Number.isFinite(kb) && kb > 0 ? `${kb.toFixed(1)} kB` : "size n/a";
    hudEl.textContent = `${name}\n${url}\n${tris | 0} tris · ${sizeLabel} · ${ms} ms\nsize ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m\norbit: drag · zoom: wheel / pinch`;
    const next = new URL(location.href);
    next.searchParams.set("asset", name);
    history.replaceState(null, "", next.toString());
  } catch (err) {
    hudEl.textContent = `Failed to load ${name}\n${url}\n${err instanceof Error ? err.message : String(err)}`;
    Tools.Error(String(err));
  }
}

selectEl.addEventListener("change", () => void load(selectEl.value));
reloadEl.addEventListener("click", () => void load(selectEl.value));
window.addEventListener("resize", () => engine.resize());
engine.runRenderLoop(() => scene.render());
void load(selectEl.value);
