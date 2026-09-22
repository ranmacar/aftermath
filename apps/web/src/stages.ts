/**
 * Construction reference stages on a hex around the center pod/console.
 * Live vertical container is built in walk.ts; these six stages show the path.
 */
import type { Scene } from "@babylonjs/core/scene";
import { setTerrainPitFraction } from "./carve";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CSG } from "@babylonjs/core/Meshes/csg";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import {
  cellCenterEnu,
  habitatClusterCells,
  hexRingEnu,
} from "./geo";
import { POD, TOWER_SPEC } from "./placements";
import { spawnHabitatCrowd } from "./crowd";

export type StageId =
  | "solar-flat"
  | "excavate"
  | "rise-1"
  | "rise-3"
  | "tower-full"
  | "gantry";

/** Distance from center console/pod to each stage center (m). */
export const STAGE_HEX_RADIUS = 36;

const STAGE_DEFS: { id: StageId; label: string }[] = [
  { id: "solar-flat", label: "1 · Solar flat" },
  { id: "excavate", label: "2 · Excavate" },
  { id: "rise-1", label: "3 · Rise 1 floor" },
  { id: "rise-3", label: "4 · Rise 3 floors" },
  { id: "tower-full", label: "5 · Full tower (7 fl)" },
  { id: "gantry", label: "6 · Gantry build" },
];

/** Six stages on a hex around the center (pod/console at origin). */
export const STAGES: {
  id: StageId;
  label: string;
  /** East offset of stage center from cell origin (m). */
  x: number;
  z: number;
}[] = STAGE_DEFS.map((def, i) => {
  // Pointy-top hex: start east, go counter-clockwise every 60°.
  const ang = (i * 60 * Math.PI) / 180;
  return {
    ...def,
    x: Math.cos(ang) * STAGE_HEX_RADIUS,
    z: Math.sin(ang) * STAGE_HEX_RADIUS,
  };
});

type Bab = {
  MeshBuilder: typeof import("@babylonjs/core").MeshBuilder;
  StandardMaterial: typeof import("@babylonjs/core").StandardMaterial;
  Color3: typeof import("@babylonjs/core").Color3;
  TransformNode: typeof import("@babylonjs/core").TransformNode;
  Vector3?: typeof import("@babylonjs/core").Vector3;
  DynamicTexture?: typeof import("@babylonjs/core").DynamicTexture;
};

const INNER_R = TOWER_SPEC.innerDiameter / 2;
const OUTER_R = TOWER_SPEC.outerDiameter / 2;
const FH = TOWER_SPEC.floorH;
/** Clearance under pitched solar underside (m). */
const ROOF_CLEAR = 0.05;
/** Tower pit depth (m) — full dig to basement. */
export const EXCAVATE_DEPTH = 13;
export const EXCAVATE_DIAMETER = TOWER_SPEC.outerDiameter;


/** Kept for call-site compatibility; wall solidity reverted (future branch). */
export const WALL_COLLISION_GROUP = 1;

type CollisionMesh = import("@babylonjs/core").Mesh;

/** No-op for collision — walls are visual only until a future branch. */
function markWall(mesh: CollisionMesh): void {
  mesh.checkCollisions = false;
}

/** Floors/roofs/bridges — ground snap owns vertical; do not mesh-collide. */
function markWalkSurface(mesh: { checkCollisions: boolean }): void {
  mesh.checkCollisions = false;
}

function mats(scene: Scene, bab: Bab) {
  const { StandardMaterial, Color3 } = bab;
  const mk = (name: string, r: number, g: number, b: number, a = 1) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = new Color3(r, g, b);
    m.specularColor = new Color3(0.06, 0.06, 0.06);
    if (a < 1) m.alpha = a;
    return m;
  };
  const out = {
    corten: mk("st-corten", 0.45, 0.28, 0.16),
    tube: mk("st-tube", 0.55, 0.58, 0.52),
    console: mk("st-console", 0.2, 0.22, 0.18),
    solar: mk("st-solar", 0.08, 0.12, 0.22),
    solarFrame: mk("st-solar-f", 0.35, 0.35, 0.38),
    dirt: mk("st-dirt", 0.32, 0.26, 0.18),
    soil: mk("st-soil", 0.28, 0.22, 0.14),
    crop: mk("st-crop", 0.28, 0.42, 0.22),
    shrub: mk("st-shrub", 0.22, 0.38, 0.18),
    canopy: mk("st-canopy", 0.18, 0.34, 0.16),
    trunk: mk("st-trunk", 0.28, 0.2, 0.12),
    wall: mk("st-wall", 0.78, 0.78, 0.74),
    glass: mk("st-glass", 0.55, 0.75, 0.85, 0.28),
    column: mk("st-col", 0.35, 0.35, 0.35),
    floor: mk("st-floor", 0.88, 0.88, 0.86),
    rail: mk("st-rail", 0.12, 0.12, 0.12),
    partition: mk("st-part", 0.32, 0.32, 0.34),
    door: mk("st-door", 0.45, 0.3, 0.16),
    furni: mk("st-furni", 0.92, 0.92, 0.9),
    seat: mk("st-seat", 0.45, 0.45, 0.48),
    facade: mk("st-facade", 0.92, 0.92, 0.9),
    labelBg: mk("st-label", 0.12, 0.14, 0.1),
  };
  out.glass.transparencyMode = 2;
  out.glass.backFaceCulling = false;
  out.glass.specularColor = new Color3(0.4, 0.45, 0.5);
  return out;
}

function addLabel(
  scene: Scene,
  bab: Bab,
  root: TransformNode,
  text: string,
  y: number,
): void {
  const { MeshBuilder, StandardMaterial, Color3, DynamicTexture } = bab;
  if (!DynamicTexture) return;
  const plane = MeshBuilder.CreatePlane(
    `lbl-${text}`,
    { width: 6, height: 1.1 },
    scene,
  );
  plane.parent = root;
  plane.position.set(0, y, OUTER_R + 1.2);
  plane.billboardMode = 7;
  const tex = new DynamicTexture(
    `lbl-tex-${text}`,
    { width: 512, height: 96 },
    scene,
    false,
  );
  tex.drawText(text, null, 64, "bold 36px sans-serif", "#e8eedc", "#1a2014", true);
  const mat = new StandardMaterial(`lbl-mat-${text}`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveColor = new Color3(0.4, 0.45, 0.35);
  mat.backFaceCulling = false;
  plane.material = mat;
}

function buildSolarPanel(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  pitched: boolean,
  offsetX = 0,
  offsetY?: number,
  /** Flat stage: console sits in the middle of the disc. */
  withConsole = false,
  withRim = true,
): void {
  const { MeshBuilder } = bab;
  const panel = MeshBuilder.CreateCylinder(
    "solar-disc",
    { height: 0.12, diameter: TOWER_SPEC.outerDiameter, tessellation: 48 },
    scene,
  );
  panel.material = m.solar;
  panel.parent = parent;
  const ang = pitched ? (POD.solarPitchDeg * Math.PI) / 180 : 0;
  const y =
    offsetY ??
    (pitched
      ? Math.sin(ang) * (TOWER_SPEC.outerDiameter / 4) + POD.tubeHeightAboveGrade
      : 0.09);
  panel.rotation.x = pitched ? -ang : 0;
  panel.position.set(offsetX, y, 0);

  if (withConsole && !pitched) {
    const consoleBox = MeshBuilder.CreateBox(
      "roof-console",
      { width: POD.consoleW, height: POD.consoleH, depth: POD.consoleD },
      scene,
    );
    consoleBox.material = m.console;
    consoleBox.parent = panel;
    consoleBox.position.set(0, 0.07 + POD.consoleH / 2, 0);
    markWall(consoleBox);
  }

  if (!withRim) return;
  // Rim as child of the disc so it stays coplanar (was rotating upright in world space).
  const rim = MeshBuilder.CreateTorus(
    "solar-rim",
    {
      diameter: TOWER_SPEC.outerDiameter - 0.2,
      thickness: 0.1,
      tessellation: 48,
    },
    scene,
  );
  rim.material = m.solarFrame;
  rim.parent = panel;
  // CreateTorus is already in XZ (Y up). Extra π/2 made a vertical hoop.
  rim.rotation.set(0, 0, 0);
  rim.position.set(0, 0.08, 0);
}

function woodMat(m: ReturnType<typeof mats>): ReturnType<typeof mats>["solarFrame"] {
  m.solarFrame.diffuseColor.set(0.42, 0.3, 0.16);
  return m.solarFrame;
}

/** Vertical ISO container (length = up). Centered on Y. */
function buildVerticalContainer(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  bottomY: number,
  name = "container",
): import("@babylonjs/core").Mesh {
  const { MeshBuilder } = bab;
  const box = MeshBuilder.CreateBox(
    name,
    {
      width: POD.width,
      height: POD.length,
      depth: POD.height,
    },
    scene,
  );
  box.material = m.corten;
  box.parent = parent;
  box.position.set(0, bottomY + POD.length / 2, 0);
  markWall(box);
  return box;
}

/**
 * 1 m Ø column from `bottomY` up to `topY`, console at grade (y≈0.55).
 */
function buildColumnWithConsole(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  bottomY: number,
  topY: number,
): { tube: import("@babylonjs/core").Mesh; consoleBox: import("@babylonjs/core").Mesh } {
  const { MeshBuilder } = bab;
  const h = topY - bottomY;
  const tube = MeshBuilder.CreateCylinder(
    "hatch-tube",
    { height: h, diameter: POD.tubeDiameter, tessellation: 20 },
    scene,
  );
  tube.material = m.tube;
  tube.parent = parent;
  tube.position.set(0, bottomY + h / 2, 0);
  markWall(tube);

  const consoleBox = MeshBuilder.CreateBox(
    "pod-console",
    { width: POD.consoleW, height: POD.consoleH, depth: POD.consoleD },
    scene,
  );
  consoleBox.material = m.console;
  consoleBox.parent = parent;
  consoleBox.position.set(POD.tubeDiameter * 0.55, POD.consoleH / 2, 0);
  markWall(consoleBox);
  return { tube, consoleBox };
}

/** Bridge deck top above stage grade (beam center 0.2 + half thickness). */
export const BRIDGE_DECK_TOP = 0.34;
export const BRIDGE_HALF_WIDTH = 0.75;
export const BRIDGE_OUTER_EXTRA = 2.8;

function buildBeamToColumn(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  shaftR: number,
  /** Inner end — wall face (rise) or near column (excavate). */
  innerR = POD.tubeDiameter * 0.6,
): void {
  const { MeshBuilder } = bab;
  const wood = woodMat(m);
  // Pitched roof (rotation.x = -pitch) lifts the +Z edge — bridge on that high side.
  const outerZ = shaftR + BRIDGE_OUTER_EXTRA; // past berm, outside the hole
  const innerZ = innerR;
  const span = outerZ - innerZ;
  const deckH = 0.28;
  const beam = MeshBuilder.CreateBox(
    "pit-beam",
    { width: BRIDGE_HALF_WIDTH * 2, height: deckH, depth: span },
    scene,
  );
  beam.material = wood;
  beam.parent = parent;
  // Top of deck at BRIDGE_DECK_TOP
  beam.position.set(0, BRIDGE_DECK_TOP - deckH / 2, (outerZ + innerZ) / 2);
  markWalkSurface(beam);
  for (const side of [-BRIDGE_HALF_WIDTH + 0.08, BRIDGE_HALF_WIDTH - 0.08] as const) {
    for (let i = 0; i < 5; i++) {
      const post = MeshBuilder.CreateBox(
        `beam-post-${side}-${i}`,
        { width: 0.08, height: 0.95, depth: 0.08 },
        scene,
      );
      post.material = wood;
      post.parent = parent;
      post.position.set(
        side,
        BRIDGE_DECK_TOP + 0.4,
        innerZ + (span * (i + 0.5)) / 5,
      );
    }
  }
}

/** Clear single-door width (m) — common German residential clear opening (~885 mm). */
export const DOOR_WIDTH = 0.885;
/** Bath door on the living separator — slightly wider clear opening. */
export const DOOR_WIDTH_BATH = 1.01;
/** Clear door height (m) — DIN-ish 1985 mm. */
export const DOOR_HEIGHT = 1.985;
/** Clear double-door / main entrance width (m) ≈ 2 × single. */
export const DOOR_WIDTH_DOUBLE = 1.77;
/** Facade window clear width (m) — typical German 1-flügel. */
export const WINDOW_WIDTH = 1.13;
/** Facade window clear height (m). */
export const WINDOW_HEIGHT = 1.40;
/** Sill above finished floor (m). */
export const WINDOW_SILL = 0.90;
/** Door swing: negative = away from corridor (into room). */
const OPEN_CORRIDOR = -1.2;
/** Door swing: positive = toward center / into living from balcony. */
const OPEN_FACADE = 1.2;

/** Pitched 15 m disc mounted on the column above grade. */
function mountPitchedSolarOnColumn(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  columnTopY: number,
): void {
  const ang = (POD.solarPitchDeg * Math.PI) / 180;
  // Keep disc clear of grade: hinge roughly at column top.
  const y = columnTopY + Math.sin(ang) * (TOWER_SPEC.outerDiameter / 4) * 0.35 + 0.4;
  buildSolarPanel(scene, bab, parent, m, true, 0, y);
}

/** Disc center Y — must match mountPitchedSolarOnColumn. */
function pitchedDiscCenterY(columnTopY: number): number {
  const ang = (POD.solarPitchDeg * Math.PI) / 180;
  return columnTopY + Math.sin(ang) * (TOWER_SPEC.outerDiameter / 4) * 0.35 + 0.4;
}

/**
 * Underside of the pitched solar disc at world plan (x,z).
 * Disc: rotation.x = -pitch (same angle). Mid-plane after Rx(-ang):
 *   Y = centerY + Z * tan(ang)   (+Z high)
 * Underside: step along −normal by halfT → − halfT * cos(ang) in Y.
 */
function pitchedRoofUndersideY(_x: number, z: number, columnTopY: number): number {
  const ang = (POD.solarPitchDeg * Math.PI) / 180;
  const halfT = 0.06; // half of disc height 0.12
  return pitchedDiscCenterY(columnTopY) + z * Math.tan(ang) - halfT * Math.cos(ang);
}

/**
 * Cylindrical shell from yBottom up to the pitched roof plane.
 * Samples underside at outer ribbon radius so the high outer edge cannot pierce.
 */
function buildPitchedWallInfill(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  wallR: number,
  yBottomFlat: number,
  columnTopY: number,
  name = "roof-infill",
): void {
  const { MeshBuilder, Vector3 } = bab;
  if (!Vector3) return;

  const tess = 64;
  const depth = 0.14;
  const ro = wallR + depth / 2;
  const ri = wallR - depth / 2;

  const outerPaths: InstanceType<NonNullable<Bab["Vector3"]>>[][] = [];
  const innerPaths: InstanceType<NonNullable<Bab["Vector3"]>>[][] = [];
  const capPaths: InstanceType<NonNullable<Bab["Vector3"]>>[][] = [];
  let any = false;

  for (let i = 0; i < tess; i++) {
    const a = (i / tess) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // MUST sample at `ro` — outer path is further out and pierces first on ±Z
    const yTop = pitchedRoofUndersideY(c * ro, s * ro, columnTopY) - ROOF_CLEAR;
    // Low side: if roof cuts below facade band, start ribbon at roof (skip / zero-height)
    const yBot = Math.min(yBottomFlat, yTop - 0.05);
    if (yTop - yBot < 0.06) continue;
    any = true;
    outerPaths.push([
      new Vector3(c * ro, yBot, s * ro),
      new Vector3(c * ro, yTop, s * ro),
    ]);
    innerPaths.push([
      new Vector3(c * ri, yBot, s * ri),
      new Vector3(c * ri, yTop, s * ri),
    ]);
    capPaths.push([
      new Vector3(c * ri, yTop, s * ri),
      new Vector3(c * ro, yTop, s * ro),
    ]);
  }
  if (!any) return;

  const mk = (n: string, paths: InstanceType<NonNullable<Bab["Vector3"]>>[][], collide: boolean) => {
    const mesh = MeshBuilder.CreateRibbon(
      n,
      { pathArray: paths, closeArray: true, closePath: false, updatable: false },
      scene,
    );
    mesh.material = m.wall;
    mesh.parent = parent;
    if (collide) markWall(mesh);
    else mesh.checkCollisions = false;
  };
  mk(`${name}-outer`, outerPaths, true);
  mk(`${name}-inner`, innerPaths, true);
  mk(`${name}-cap`, capPaths, false);
}


/**
 * Live pod: vertical container buried 1 m (top at -1), column through grade,
 * console at grade; solar preview mounts on the column when powered.
 */
export function buildBuriedPod(
  scene: Scene,
  bab: Bab,
  groundY: number,
): {
  root: TransformNode;
  tube: import("@babylonjs/core").Mesh;
  consoleBox: import("@babylonjs/core").Mesh;
  solarPreview: import("@babylonjs/core").Mesh;
} {
  const { MeshBuilder, TransformNode } = bab;
  const m = mats(scene, bab);
  const root = new TransformNode("live-pod", scene);
  root.position.set(0, groundY, 0);

  const topY = -POD.buryDepth;
  const bottomY = topY - POD.length;
  buildVerticalContainer(scene, bab, root, m, bottomY, "live-container");

  const columnTop = POD.tubeHeightAboveGrade;
  const { tube, consoleBox } = buildColumnWithConsole(
    scene,
    bab,
    root,
    m,
    topY,
    columnTop,
  );

  const solarPreview = MeshBuilder.CreateCylinder(
    "live-solar",
    { height: 0.12, diameter: TOWER_SPEC.outerDiameter, tessellation: 48 },
    scene,
  );
  solarPreview.material = m.solar;
  solarPreview.parent = root;
  solarPreview.isVisible = false;
  const ang = (POD.solarPitchDeg * Math.PI) / 180;
  solarPreview.rotation.x = -ang;
  solarPreview.position.set(
    0,
    columnTop + Math.sin(ang) * (TOWER_SPEC.outerDiameter / 4) * 0.35 + 0.4,
    0,
  );

  return { root, tube, consoleBox, solarPreview };
}

export function buildBerm(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  shaftR: number,
): void {
  const { MeshBuilder } = bab;
  // Horizontal spoil berm: ~2 m tube, sits on grade, outside the 15 m hole.
  const tube = 2.2;
  const berm = MeshBuilder.CreateTorus(
    "berm",
    {
      diameter: (shaftR + 1.6 + tube / 2) * 2,
      thickness: tube,
      tessellation: 48,
    },
    scene,
  );
  berm.material = m.dirt;
  berm.parent = parent;
  berm.rotation.set(0, 0, 0);
  berm.position.y = tube / 2 * 0.55; // rest on grade
  berm.scaling.y = 0.7; // slightly flattened mound, still ~1.5 m high
  markWall(berm);
}

/** Base excavate column top (roof just above grade on the column). */
const EXCAVATE_COLUMN_TOP = POD.tubeHeightAboveGrade + 1.2;

/**
 * Static pit: buried tech container, column, berm, pitched roof.
 */
function buildExcavateStage(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
): void {
  const floorY = -EXCAVATE_DEPTH;
  buildVerticalContainer(scene, bab, parent, m, floorY, "pit-container");
  const containerTop = floorY + POD.length;
  buildColumnWithConsole(scene, bab, parent, m, containerTop, EXCAVATE_COLUMN_TOP);
  buildBeamToColumn(scene, bab, parent, m, OUTER_R, POD.tubeDiameter * 0.6);
  buildBerm(scene, bab, parent, m, OUTER_R);
  mountPitchedSolarOnColumn(scene, bab, parent, m, EXCAVATE_COLUMN_TOP);
}

/**
 * Last stage: gantry pivots to dig, sets the tech container, pours the column,
 * then climbs it to pour slab wedges and wall panels.
 */
const GANTRY_FLOORS = 3;
const GANTRY_LOOP_S = 78;
/** Outer shell thickness. The 2.5 m balcony zone is not solid wall. */
const OUTER_WALL_T = 0.4;

function buildGantryStage(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  ground: Mesh | null,
  pitX: number,
  pitZ: number,
  gradeY: number,
): void {
  const { MeshBuilder, TransformNode, StandardMaterial, Color3 } = bab;
  const steel = new StandardMaterial("gantry-steel", scene);
  steel.diffuseColor = new Color3(0.82, 0.62, 0.12);
  steel.specularColor = new Color3(0.08, 0.08, 0.08);

  const pitBottom = -EXCAVATE_DEPTH;
  const containerTop = pitBottom + POD.length;
  // Tall enough to reach the pitched roof, whose low rim sits above the gantry.
  const columnMeshH = GANTRY_FLOORS * FH + 14 - containerTop;
  const column = MeshBuilder.CreateCylinder(
    "build-column",
    { height: columnMeshH, diameter: POD.tubeDiameter, tessellation: 24 },
    scene,
  );
  column.material = m.column;
  column.parent = parent;
  column.isVisible = false;

  const berm = MeshBuilder.CreateTorus(
    "build-berm",
    {
      // Outside the carved bank so the ring is on uncut ground.
      diameter: (OUTER_R + 3.6) * 2,
      thickness: 2.2,
      tessellation: 40,
    },
    scene,
  );
  berm.material = m.dirt;
  berm.parent = parent;
  berm.scaling.x = 1;
  berm.scaling.z = 1;
  berm.isVisible = false;

  const container = buildVerticalContainer(
    scene,
    bab,
    parent,
    m,
    pitBottom,
    "tech-container",
  );
  container.isVisible = false;
  const tech = new StandardMaterial("tech-glow", scene);
  tech.diffuseColor = new Color3(0.15, 0.35, 0.32);
  tech.emissiveColor = new Color3(0.05, 0.22, 0.18);
  const door = MeshBuilder.CreateBox(
    "tech-door",
    { width: 1.1, height: 2.1, depth: 0.06 },
    scene,
  );
  door.material = m.console;
  door.parent = container;
  door.position.set(0, POD.length / 2 - 1.4, POD.height / 2 + 0.02);
  for (let rack = 0; rack < 3; rack++) {
    const cab = MeshBuilder.CreateBox(
      `tech-rack-${rack}`,
      { width: 0.55, height: 1.8, depth: 0.4 },
      scene,
    );
    cab.material = tech;
    cab.parent = container;
    cab.position.set(
      POD.width / 2 + 0.22,
      POD.length / 2 - 2.4,
      -0.7 + rack * 0.65,
    );
  }

  const slabH = 0.28;
  const wallBottom = slabH;
  const wallFullH = GANTRY_FLOORS * FH - slabH;
  const beamCount = 8;
  const ringCount = 5;
  const beamR0 = POD.tubeDiameter * 0.5 + 0.35;
  const beamR1 = OUTER_R - 0.35;
  const beamLen = beamR1 - beamR0;
  type FloorDeck = {
    beams: import("@babylonjs/core").Mesh[];
    rings: import("@babylonjs/core").Mesh[];
    ringR: number[];
    slab: import("@babylonjs/core").Mesh;
  };
  const decks: FloorDeck[] = [];
  for (let i = 0; i < GANTRY_FLOORS; i++) {
    const y = i * FH + slabH / 2;
    const beams: import("@babylonjs/core").Mesh[] = [];
    for (let b = 0; b < beamCount; b++) {
      const spoke = new TransformNode(`spoke-${i}-${b}`, scene);
      spoke.parent = parent;
      spoke.position.y = y;
      spoke.rotation.y = (b / beamCount) * Math.PI * 2;
      const beam = MeshBuilder.CreateCylinder(
        `beam-${i}-${b}`,
        { height: beamLen, diameter: 0.34, tessellation: 10 },
        scene,
      );
      beam.material = m.floor;
      beam.parent = spoke;
      beam.rotation.z = Math.PI / 2;
      beam.position.x = beamR0 + beamLen / 2;
      beam.isVisible = false;
      beams.push(beam);
    }
    const rings: import("@babylonjs/core").Mesh[] = [];
    const ringR: number[] = [];
    for (let r = 0; r < ringCount; r++) {
      const radius = beamR0 + ((r + 1) / ringCount) * beamLen;
      const ring = MeshBuilder.CreateTorus(
        `ring-${i}-${r}`,
        { diameter: radius * 2, thickness: 0.36, tessellation: 36 },
        scene,
      );
      ring.material = m.floor;
      ring.parent = parent;
      ring.position.y = y;
      ring.isVisible = false;
      rings.push(ring);
      ringR.push(radius);
    }
    const disc = MeshBuilder.CreateCylinder(
      `full-slab-src-${i}`,
      { height: slabH, diameter: OUTER_R * 2, tessellation: 48 },
      scene,
    );
    disc.isVisible = false;
    const hole = MeshBuilder.CreateCylinder(
      `full-slab-hole-${i}`,
      { height: slabH + 0.2, diameter: POD.tubeDiameter + 0.4, tessellation: 24 },
      scene,
    );
    hole.isVisible = false;
    const slab = CSG.FromMesh(disc).subtract(CSG.FromMesh(hole)).toMesh(
      `full-slab-${i}`,
      m.floor,
      scene,
    );
    disc.dispose();
    hole.dispose();
    slab.parent = parent;
    slab.position.y = y;
    slab.isVisible = false;
    decks.push({ beams, rings, ringR, slab });
  }

  const shellOuterD = OUTER_R * 2;
  const shellInnerD = shellOuterD - OUTER_WALL_T * 2;
  const wallOuter = MeshBuilder.CreateCylinder(
    "slip-wall-out",
    { height: wallFullH, diameter: shellOuterD, tessellation: 48 },
    scene,
  );
  const wallInner = MeshBuilder.CreateCylinder(
    "slip-wall-in",
    { height: wallFullH + 0.4, diameter: shellInnerD, tessellation: 40 },
    scene,
  );
  wallOuter.isVisible = false;
  wallInner.isVisible = false;
  const slipWall = CSG.FromMesh(wallOuter)
    .subtract(CSG.FromMesh(wallInner))
    .toMesh("slip-wall", m.facade, scene);
  wallOuter.dispose();
  wallInner.dispose();
  slipWall.parent = parent;
  slipWall.isVisible = false;

  const formH = 1.15;
  const formOuter = MeshBuilder.CreateCylinder(
    "slip-form-out",
    { height: formH, diameter: shellOuterD + 0.16, tessellation: 48 },
    scene,
  );
  const formInner = MeshBuilder.CreateCylinder(
    "slip-form-in",
    { height: formH + 0.3, diameter: shellInnerD - 0.12, tessellation: 40 },
    scene,
  );
  formOuter.isVisible = false;
  formInner.isVisible = false;
  const slipForm = CSG.FromMesh(formOuter)
    .subtract(CSG.FromMesh(formInner))
    .toMesh("slip-form", steel, scene);
  formOuter.dispose();
  formInner.dispose();
  slipForm.parent = parent;
  slipForm.isVisible = false;

  const baseH = EXCAVATE_DEPTH;
  const baseOut = MeshBuilder.CreateCylinder(
    "base-wall-out",
    { height: baseH, diameter: shellOuterD, tessellation: 48 },
    scene,
  );
  const baseIn = MeshBuilder.CreateCylinder(
    "base-wall-in",
    { height: baseH + 0.4, diameter: shellInnerD, tessellation: 40 },
    scene,
  );
  baseOut.isVisible = false;
  baseIn.isVisible = false;
  const baseWall = CSG.FromMesh(baseOut)
    .subtract(CSG.FromMesh(baseIn))
    .toMesh("base-wall", m.facade, scene);
  baseOut.dispose();
  baseIn.dispose();
  baseWall.parent = parent;
  baseWall.isVisible = false;
  const baseFormOut = MeshBuilder.CreateCylinder(
    "base-form-out",
    { height: formH, diameter: shellOuterD + 0.16, tessellation: 48 },
    scene,
  );
  const baseFormIn = MeshBuilder.CreateCylinder(
    "base-form-in",
    { height: formH + 0.3, diameter: shellInnerD - 0.12, tessellation: 40 },
    scene,
  );
  baseFormOut.isVisible = false;
  baseFormIn.isVisible = false;
  const baseForm = CSG.FromMesh(baseFormOut)
    .subtract(CSG.FromMesh(baseFormIn))
    .toMesh("base-form", steel, scene);
  baseFormOut.dispose();
  baseFormIn.dispose();
  baseForm.parent = parent;
  baseForm.isVisible = false;

  const gantry = new TransformNode("gantry", scene);
  gantry.parent = parent;
  const sleeve = MeshBuilder.CreateCylinder(
    "gantry-sleeve",
    { height: 1.5, diameter: POD.tubeDiameter + 0.45, tessellation: 20 },
    scene,
  );
  sleeve.material = steel;
  sleeve.parent = gantry;
  const boomLen = OUTER_R + 2;
  const boom = MeshBuilder.CreateBox(
    "gantry-boom",
    { width: boomLen, height: 0.32, depth: 0.42 },
    scene,
  );
  boom.material = steel;
  boom.parent = gantry;
  boom.position.x = boomLen / 2;
  const trolley = MeshBuilder.CreateBox(
    "gantry-trolley",
    { width: 0.7, height: 0.38, depth: 0.55 },
    scene,
  );
  trolley.material = m.column;
  trolley.parent = gantry;
  trolley.position.set(boomLen * 0.7, 0.28, 0);
  const cabin = MeshBuilder.CreateBox(
    "gantry-cabin",
    { width: 1.1, height: 1.1, depth: 1.1 },
    scene,
  );
  cabin.material = m.console;
  cabin.parent = gantry;
  cabin.position.set(-0.2, 0.9, 0.9);
  const slew = MeshBuilder.CreateTorus(
    "gantry-slew",
    { diameter: POD.tubeDiameter + 0.9, thickness: 0.18, tessellation: 20 },
    scene,
  );
  slew.material = steel;
  slew.parent = gantry;
  slew.position.y = -0.7;
  const counter = MeshBuilder.CreateBox(
    "gantry-counter",
    { width: 1.6, height: 0.7, depth: 0.7 },
    scene,
  );
  counter.material = m.column;
  counter.parent = gantry;
  counter.position.x = -1.5;
  const tool = new TransformNode("gantry-tool", scene);
  tool.parent = gantry;
  tool.position.x = boomLen;
  const hopper = MeshBuilder.CreateBox(
    "gantry-hopper",
    { width: 0.9, height: 0.7, depth: 0.9 },
    scene,
  );
  hopper.material = steel;
  hopper.parent = tool;
  const bucket = MeshBuilder.CreateBox(
    "gantry-bucket",
    { width: 0.7, height: 0.45, depth: 1.1 },
    scene,
  );
  bucket.material = m.corten;
  bucket.parent = tool;
  bucket.position.y = -0.7;
  const stream = MeshBuilder.CreateCylinder(
    "gantry-stream",
    { height: 1.4, diameter: 0.12, tessellation: 8 },
    scene,
  );
  stream.material = m.floor;
  stream.parent = tool;
  stream.position.y = -1.5;
  stream.isVisible = false;

  const roof = new TransformNode("build-roof", scene);
  roof.parent = parent;
  const roofR = TOWER_SPEC.outerDiameter / 2;
  const roofDisc = MeshBuilder.CreateCylinder(
    "gantry-roof",
    { height: 0.12, diameter: TOWER_SPEC.outerDiameter, tessellation: 48 },
    scene,
  );
  roofDisc.material = m.solar;
  roofDisc.parent = roof;

  const setGrowY = (
    mesh: import("@babylonjs/core").Mesh,
    bottom: number,
    fullH: number,
    t: number,
  ): void => {
    const shown = t > 0.02;
    mesh.isVisible = shown;
    if (!shown) return;
    const h = fullH * t;
    mesh.scaling.y = t;
    mesh.position.y = bottom + h / 2;
  };

  const apply = (t: number): void => {
    const digEnd = 16;
    const colEnd = 26;
    let carriageY = 2.2;
    let spin = t * 0.7;
    let dip = 0.15;
    let bermT = 0;
    let columnTop = containerTop;
    let pour = false;
    let trolleyX = boomLen * 0.55;

    const hideFloor = (floor: number): void => {
      const deck = decks[floor]!;
      for (const beam of deck.beams) beam.isVisible = false;
      for (const ring of deck.rings) ring.isVisible = false;
      deck.slab.isVisible = false;
    };
    const setSlab = (floor: number, u: number): void => {
      const slab = decks[floor]!.slab;
      const shown = u > 0.02;
      slab.isVisible = shown;
      slab.scaling.x = shown ? u : 1;
      slab.scaling.z = shown ? u : 1;
    };
    const setBeams = (floor: number, shown: number): void => {
      decks[floor]!.beams.forEach((beam, b) => {
        const su = Math.min(1, Math.max(0, shown - b));
        beam.isVisible = su > 0.02;
        beam.scaling.y = su;
        beam.position.x = beamR0 + (beamLen * su) / 2;
      });
    };
    const setRings = (floor: number, shown: number): void => {
      const deck = decks[floor]!;
      const tubeR = 0.18;
      const base = floor * FH + 0.02;
      deck.rings.forEach((ring, r) => {
        const su = Math.min(1, Math.max(0, shown - r));
        ring.isVisible = su > 0.02;
        ring.scaling.y = Math.max(su, 0.001);
        ring.position.y = base + tubeR * su;
      });
    };

    if (t < digEnd) {
      for (let i = 0; i < GANTRY_FLOORS; i++) hideFloor(i);
      setGrowY(slipWall, wallBottom, wallFullH, 0);
      slipForm.isVisible = false;
      container.isVisible = true;
      container.position.y = pitBottom + POD.length / 2;
      const pitchEnd = digEnd * 0.45;
      const pitch = (POD.solarPitchDeg * Math.PI) / 180;
      if (t < pitchEnd) {
        const u = t / pitchEnd;
        const a = pitch * u;
        // Hinge on the low rim so the disc pitches up off the ground.
        roofDisc.rotation.x = -a;
        roofDisc.position.y = roofR * Math.sin(a) + 0.08;
        roofDisc.position.z = -roofR * (1 - Math.cos(a));
        roof.position.y = 0;
        bermT = 0;
        setGrowY(baseWall, pitBottom, baseH, 0);
        baseForm.isVisible = false;
        if (ground) {
          setTerrainPitFraction(ground, pitX, pitZ, OUTER_R, gradeY, EXCAVATE_DEPTH, 0);
        }
        gantry.setEnabled(u > 0.55);
        carriageY = 0.4;
        trolleyX = boomLen;
        dip = 0.2;
        spin = 0.4;
      } else {
        const u = (t - pitchEnd) / (digEnd - pitchEnd);
        roofDisc.rotation.x = -pitch;
        roofDisc.position.y = roofR * Math.sin(pitch) + 0.08;
        roofDisc.position.z = -roofR * (1 - Math.cos(pitch));
        roof.position.y = u * 6;
        bermT = u;
        setGrowY(baseWall, pitBottom, baseH, 0);
        baseForm.isVisible = false;
        if (ground) {
          setTerrainPitFraction(
            ground,
            pitX,
            pitZ,
            OUTER_R,
            gradeY,
            EXCAVATE_DEPTH,
            u,
          );
        }
        gantry.setEnabled(true);
        carriageY = 1.6 + u * 1.2;
        trolleyX = boomLen * 0.9;
        dip = 0.45;
        spin = t * 0.8;
      }
    } else if (t < colEnd) {
      for (let i = 0; i < GANTRY_FLOORS; i++) hideFloor(i);
      setGrowY(slipWall, wallBottom, wallFullH, 0);
      slipForm.isVisible = false;
      setGrowY(baseWall, pitBottom, baseH, 0);
      baseForm.isVisible = false;
      container.isVisible = true;
      container.position.y = pitBottom + POD.length / 2;
      if (ground) {
        setTerrainPitFraction(ground, pitX, pitZ, OUTER_R, gradeY, EXCAVATE_DEPTH, 1);
      }
      const u = (t - digEnd) / (colEnd - digEnd);
      bermT = 1;
      pour = true;
      columnTop = containerTop + (2.4 - containerTop) * u;
      carriageY = Math.max(2.2, columnTop + 1.4);
      dip = 0.08;
      spin = t * 0.5;
      trolleyX = 1.4;
    } else if (t < colEnd + 8) {
      for (let i = 0; i < GANTRY_FLOORS; i++) hideFloor(i);
      setGrowY(slipWall, wallBottom, wallFullH, 0);
      slipForm.isVisible = false;
      container.isVisible = true;
      container.position.y = pitBottom + POD.length / 2;
      if (ground) {
        setTerrainPitFraction(ground, pitX, pitZ, OUTER_R, gradeY, EXCAVATE_DEPTH, 1);
      }
      bermT = 1;
      const u = (t - colEnd) / 8;
      setGrowY(baseWall, pitBottom, baseH, u);
      const top = pitBottom + baseH * u;
      baseForm.isVisible = u > 0.02 && u < 0.995;
      baseForm.position.y = top + formH / 2 - 0.08;
      carriageY = Math.max(1.8, top + formH + 0.3);
      spin = t * 0.55;
      trolleyX = boomLen * 0.92;
      pour = u < 0.995;
      dip = 0.08;
      columnTop = Math.max(columnTop, 2.4);
    } else {
      bermT = 1;
      container.isVisible = true;
      container.position.y = pitBottom + POD.length / 2;
      setGrowY(baseWall, pitBottom, baseH, 1);
      baseForm.isVisible = false;
      columnTop = 2.4;
      const after = t - (colEnd + 8);
      if (ground) {
        // First slab starts now — put the spoil back so the basement is buried.
        const filled = Math.min(1, after / 1.6);
        setTerrainPitFraction(
          ground,
          pitX,
          pitZ,
          OUTER_R,
          gradeY,
          EXCAVATE_DEPTH,
          1 - filled,
        );
      }
      const beamSpan = 3;
      const ringSpan = 3;
      const slabSpan = 2.5;
      const wallSpan = 4;
      const meshSpan = beamSpan + ringSpan;
      const step = meshSpan + slabSpan + wallSpan;
      let wallStoreys = 0;
      let wallU = 0;
      let posed = false;
      for (let i = 0; i < GANTRY_FLOORS; i++) {
        const local = after - i * step;
        if (local < 0) {
          hideFloor(i);
          continue;
        }
        if (local >= step) {
          setBeams(i, beamCount);
          setRings(i, ringCount);
          setSlab(i, 1);
          continue;
        }
        posed = true;
        columnTop = Math.max(columnTop, i * FH + slabH);
        carriageY = i * FH + 1.65;
        if (local < beamSpan) {
          const u = local / beamSpan;
          const shown = u * beamCount;
          setBeams(i, shown);
          setRings(i, 0);
          setSlab(i, 0);
          const idx = Math.min(beamCount - 1, Math.floor(shown));
          spin = (idx / beamCount) * Math.PI * 2;
          trolleyX = beamR0 + beamLen * (shown - idx);
          pour = true;
          dip = 0.06;
          wallStoreys = i;
          wallU = 0;
        } else if (local < meshSpan) {
          const u = (local - beamSpan) / ringSpan;
          const shown = u * ringCount;
          setBeams(i, beamCount);
          setRings(i, shown);
          setSlab(i, 0);
          const idx = Math.min(ringCount - 1, Math.floor(shown));
          spin = u * ringCount * Math.PI * 2;
          trolleyX = decks[i]!.ringR[idx] ?? beamR1;
          pour = true;
          dip = 0.06;
          wallStoreys = i;
          wallU = 0;
        } else if (local < meshSpan + slabSpan) {
          const u = (local - meshSpan) / slabSpan;
          setBeams(i, beamCount);
          setRings(i, ringCount);
          setSlab(i, u);
          spin = u * Math.PI * 2;
          trolleyX = beamR0 + beamLen * u;
          pour = true;
          dip = 0.05;
          wallStoreys = i;
          wallU = 0;
        } else {
          setBeams(i, beamCount);
          setRings(i, ringCount);
          setSlab(i, 1);
          const u = Math.min(1, (local - meshSpan - slabSpan) / wallSpan);
          wallStoreys = i;
          wallU = u;
          pour = u < 0.995;
          dip = 0.05;
          spin = t * 0.5;
          trolleyX = boomLen * 0.88;
          carriageY = 0;
        }
      }
      if (!posed && after >= GANTRY_FLOORS * step) {
        wallStoreys = GANTRY_FLOORS - 1;
        wallU = 1;
        carriageY = GANTRY_FLOORS * FH + 1.2;
        spin = 0.4;
        trolleyX = boomLen * 0.7;
      }
      const startTop = wallStoreys === 0 ? wallBottom : wallStoreys * FH;
      const endTop = (wallStoreys + 1) * FH;
      const wallTop = startTop + (endTop - startTop) * wallU;
      if (wallTop <= wallBottom + 0.02) {
        setGrowY(slipWall, wallBottom, wallFullH, 0);
        slipForm.isVisible = false;
      } else {
        setGrowY(slipWall, wallBottom, wallFullH, (wallTop - wallBottom) / wallFullH);
        slipForm.isVisible = true;
        slipForm.position.y = wallTop + formH / 2 - 0.1;
        if (wallU > 0) carriageY = wallTop + formH + 0.35;
      }
      if (wallU > 0) columnTop = Math.max(columnTop, wallTop);
    }

    const bermScale = bermT;
    berm.isVisible = bermT > 0.02;
    berm.scaling.y = bermScale;
    // Torus tube radius is 1.1. Keep the bottom on grade while the ring rises.
    berm.position.y = 1.1 * bermScale;
    gantry.position.y = carriageY;
    gantry.rotation.y = spin;
    tool.rotation.z = dip;
    trolley.position.x = trolleyX;
    stream.isVisible = pour;
    bucket.isVisible = t < digEnd;
    roof.setEnabled(true);
    if (t >= digEnd) {
      // Low rim of the pitched disc sits just above the local hinge.
      const lowRim = roofDisc.position.y - roofR * Math.sin(-roofDisc.rotation.x);
      const minLift = carriageY + 1.7 - lowRim;
      roof.position.y = Math.max(roof.position.y, minLift);
      const u = t >= colEnd ? 1 : (t - digEnd) / (colEnd - digEnd);
      const columnReach = containerTop + (roof.position.y + roofDisc.position.y - containerTop) * u;
      const colT = Math.max(0, Math.min(1, (columnReach - containerTop) / columnMeshH));
      setGrowY(column, containerTop, columnMeshH, colT);
    } else {
      setGrowY(column, containerTop, columnMeshH, 0);
    }
  };

  apply(0);
  let elapsed = 0;
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
    elapsed = (elapsed + dt) % GANTRY_LOOP_S;
    apply(elapsed);
  });
  parent.onDisposeObservable.add(() => {
    scene.onBeforeRenderObservable.remove(obs);
  });
}


function buildSolidWallBand(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  name: string,
  wallR: number,
  y0: number,
  h: number,
): void {
  if (h <= 0.05) return;
  const { MeshBuilder } = bab;
  const wall = MeshBuilder.CreateCylinder(
    name,
    {
      height: h,
      diameter: wallR * 2,
      tessellation: 48,
      enclose: false,
    },
    scene,
  );
  wall.material = m.wall;
  wall.parent = parent;
  wall.position.y = y0 + h / 2;
  markWall(wall);
}


/** Arc panel on circular wall. Slight chord overlap so panels meet with no gaps. */
function placeArcPanel(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  name: string,
  material: ReturnType<typeof mats>["facade"],
  r: number,
  angA: number,
  angB: number,
  y0: number,
  h0: number,
  h1: number,
  depth: number,
  collide: boolean,
): void {
  if (angB <= angA + 0.008) return;
  const { MeshBuilder } = bab;
  const mid = (angA + angB) / 2;
  const chord = 2 * r * Math.sin((angB - angA) / 2);
  const h = h1 - h0;
  // Overlap neighbors so curved walls don't show hairline gaps
  const panel = MeshBuilder.CreateBox(
    name,
    { width: Math.max(chord * 1.01, 0.06), height: h, depth },
    scene,
  );
  panel.material = material;
  panel.parent = parent;
  panel.position.set(Math.cos(mid) * r, y0 + h0 + h / 2, Math.sin(mid) * r);
  panel.rotation.y = -mid + Math.PI / 2;
  if (collide) markWall(panel);
  else panel.checkCollisions = false;
}

/** Angular half-width for a chord of length `w` on radius `r`. */
function angHalf(r: number, w: number): number {
  return Math.atan2(w / 2, r);
}

/** Wall punch uses fixed radial segs — door cuts snap to those edges. */
const WALL_SEGS = 96;

function snapOpeningToWallSegs(a0: number, a1: number, segs = WALL_SEGS): { a0: number; a1: number } {
  const step = (Math.PI * 2) / segs;
  const i0 = Math.floor(a0 / step + 1e-9);
  const i1 = Math.ceil(a1 / step - 1e-9);
  return { a0: i0 * step, a1: Math.max(i0 + 1, i1) * step };
}

/** Snap inward (never widen) so a living punch cannot overshoot the tangent. */
function snapOpeningInward(a0: number, a1: number, segs = WALL_SEGS): { a0: number; a1: number } {
  const step = (Math.PI * 2) / segs;
  const i0 = Math.ceil(a0 / step - 1e-9);
  const i1 = Math.floor(a1 / step + 1e-9);
  return { a0: i0 * step, a1: Math.max(i0 + 1, i1) * step };
}

type WallOpening = {
  /** Half-open angular span [a0, a1) in rad — identical for punch and frame. */
  a0: number;
  a1: number;
  /** Height clear span relative to shell yBottom (world Y = yBottom + these). */
  h0: number;
  h1: number;
};

/**
 * One door cut: snapped angular span + height. Frame and punched hole MUST use this object.
 */
function makeDoorCut(
  wallR: number,
  midAng: number,
  clearWidthM: number,
  clearHeightM: number,
): WallOpening {
  const half = angHalf(wallR, clearWidthM);
  const snapped = snapOpeningToWallSegs(midAng - half, midAng + half);
  return { a0: snapped.a0, a1: snapped.a1, h0: 0, h1: clearHeightM };
}

/**
 * Window cut snapped to wall segs — same a0/a1 for punch and frame.
 * Fixed half-seg count from clearWidth so every window matches.
 */
function makeWindowCut(
  wallR: number,
  midAng: number,
  clearWidthM: number,
  sillM: number,
  clearHeightM: number,
): WallOpening {
  const half = angHalf(wallR, clearWidthM);
  const step = (Math.PI * 2) / WALL_SEGS;
  const halfSegs = Math.max(1, Math.round(half / step));
  const midI = Math.round(midAng / step);
  const a0 = (midI - halfSegs) * step;
  const a1 = (midI + halfSegs) * step;
  return { a0, a1, h0: sillM, h1: sillM + clearHeightM };
}

/** `n` equally spaced mid-angles on [a0, a1] (centers of equal facade slots). */
function equalFacadeMids(a0: number, a1: number, n: number): number[] {
  if (n <= 0 || a1 <= a0) return [];
  const mids: number[] = [];
  for (let i = 0; i < n; i++) {
    mids.push(a0 + ((i + 0.5) / n) * (a1 - a0));
  }
  return mids;
}

/**
 * Frame + glass in a facade window cutout. `angA`/`angB`/`sill`/`head` match the punch.
 */
function buildFacadeWindow(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  name: string,
  r: number,
  angA: number,
  angB: number,
  y0: number,
  sill: number,
  head: number,
  wallDepth: number,
): void {
  const { MeshBuilder } = bab;
  const mid = (angA + angB) / 2;
  const clearW = 2 * r * Math.sin((angB - angA) / 2);
  const thick = 0.06;
  const jambDepth = Math.max(wallDepth + 0.04, 0.12);
  const rot = -mid + Math.PI / 2;
  const tx = -Math.sin(mid);
  const tz = Math.cos(mid);
  const rx = Math.cos(mid);
  const rz = Math.sin(mid);
  const half = clearW / 2;
  const winH = head - sill;

  const place = (
    n: string,
    w: number,
    h: number,
    d: number,
    along: number,
    yMid: number,
    mat: ReturnType<typeof mats>["facade"],
    collide: boolean,
  ): void => {
    const box = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, scene);
    box.material = mat;
    box.parent = parent;
    box.position.set(rx * r + tx * along, y0 + yMid, rz * r + tz * along);
    box.rotation.y = rot;
    if (collide) markWall(box);
    else box.checkCollisions = false;
  };

  place(`${name}-jamb-l`, thick, winH, jambDepth, -(half - thick / 2), sill + winH / 2, m.wall, true);
  place(`${name}-jamb-r`, thick, winH, jambDepth, half - thick / 2, sill + winH / 2, m.wall, true);
  place(`${name}-head`, clearW, thick, jambDepth, 0, head - thick / 2, m.wall, true);
  place(`${name}-sill`, clearW, 0.05, jambDepth + 0.02, 0, sill + 0.025, m.wall, true);
  // Mullion
  place(`${name}-mullion`, 0.04, winH - 0.08, 0.04, 0, sill + winH / 2, m.wall, false);
  const glassH = Math.max(0.2, winH - thick - 0.08);
  const glassW = Math.max(0.2, clearW - thick * 2 - 0.04);
  place(`${name}-glass`, glassW, glassH, 0.02, 0, sill + winH / 2, m.glass, false);
}

/** Half-open arc test: a in [a0, a1). */
function angInSpanHalfOpen(a: number, a0: number, a1: number): boolean {
  const tau = Math.PI * 2;
  const n = ((a % tau) + tau) % tau;
  const lo = ((a0 % tau) + tau) % tau;
  let hi = ((a1 % tau) + tau) % tau;
  if (Math.abs(a1 - a0) >= tau - 1e-9) return true;
  if (hi === lo) {
    // a1 was exactly one turn above a0 in raw form
    if (a1 > a0 + 1e-9) return true;
    return false;
  }
  if (hi < lo) return n >= lo || n < hi;
  return n >= lo && n < hi;
}

/**
 * Segment [s0,s1] is removed iff its midpoint lies in the half-open opening.
 * (Openings are snapped to seg edges, so this matches frame angles exactly —
 * inclusive edge tests used to steal an extra segment on each side.)
 */
function angSegHitsOpening(s0: number, s1: number, o0: number, o1: number): boolean {
  return angInSpanHalfOpen((s0 + s1) / 2, o0, o1);
}

/**
 * One continuous cylindrical shell with rectangular cutouts (doors/windows).
 * Fine radial tessellation — reads as a cylinder with holes, not wall "sections".
 */
function buildPunchedCylinderWall(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  material: ReturnType<typeof mats>["wall"],
  name: string,
  wallR: number,
  yBottom: number,
  yTopFlat: number,
  depth: number,
  openings: WallOpening[],
  ceilAt?: (x: number, z: number) => number,
): void {
  const segs = WALL_SEGS;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const amid = (a0 + a1) / 2;
    let yTop = yTopFlat;
    if (ceilAt) {
      yTop = Math.min(yTop, ceilAt(Math.cos(amid) * wallR, Math.sin(amid) * wallR));
    }
    if (yTop <= yBottom + 0.05) continue;

    // Openings that overlap this radial segment (not mid-only — that left door wedges)
    const cuts: { h0: number; h1: number }[] = [];
    for (const op of openings) {
      if (!angSegHitsOpening(a0, a1, op.a0, op.a1)) continue;
      const lo = Math.max(0, op.h0);
      const hi = Math.min(yTop - yBottom, op.h1);
      if (hi > lo + 0.04) cuts.push({ h0: lo, h1: hi });
    }
    cuts.sort((u, v) => u.h0 - v.h0);
    const merged: { h0: number; h1: number }[] = [];
    for (const c of cuts) {
      const last = merged[merged.length - 1];
      if (last && c.h0 <= last.h1 + 0.02) last.h1 = Math.max(last.h1, c.h1);
      else merged.push({ ...c });
    }

    // Solid bands = [0, H] minus merged cuts
    const H = yTop - yBottom;
    let cursor = 0;
    let band = 0;
    for (const c of merged) {
      if (c.h0 > cursor + 0.04) {
        placeArcPanel(
          scene, bab, parent, `${name}-${i}-${band++}`, material,
          wallR, a0, a1, yBottom, cursor, c.h0, depth, true,
        );
      }
      cursor = Math.max(cursor, c.h1);
    }
    if (H > cursor + 0.04) {
      placeArcPanel(
        scene, bab, parent, `${name}-${i}-${band}`, material,
        wallR, a0, a1, yBottom, cursor, H, depth, true,
      );
    }
  }
}


/**
 * Door frame seated in a cylindrical wall cutout + hinged leaf.
 * `angA`/`angB` are the punched hole [angA, angB) — same values as WallOpening.
 * Outer jamb faces sit on those edges (jambs inside the hole).
 */
function buildHingedDoor(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  name: string,
  r: number,
  angA: number,
  angB: number,
  y0: number,
  doorH: number,
  wallDepth: number,
  /**
   * Swing angle (rad). Sign: **positive → toward center** (inward);
   * negative → toward outside (increasing r). Leaf hinged on the CCW jamb.
   */
  openRad: number,
  frameMat: ReturnType<typeof mats>["facade"],
): { clearA: number; clearB: number } {
  const { MeshBuilder, TransformNode } = bab;
  const mid = (angA + angB) / 2;
  const clearW = 2 * r * Math.sin((angB - angA) / 2);
  const thick = 0.07;
  const jambDepth = Math.max(wallDepth + 0.06, 0.14);
  const rot = -mid + Math.PI / 2;
  const tx = -Math.sin(mid);
  const tz = Math.cos(mid);
  const rx = Math.cos(mid);
  const rz = Math.sin(mid);
  const half = clearW / 2;

  const placeFrame = (
    n: string,
    w: number,
    h: number,
    d: number,
    along: number,
    yMid: number,
  ): void => {
    const box = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, scene);
    box.material = frameMat;
    box.parent = parent;
    // Seat frame on the wall radius so it fills the cutout thickness
    box.position.set(rx * r + tx * along, y0 + yMid, rz * r + tz * along);
    box.rotation.y = rot;
    markWall(box);
  };

  // Jambs sit INSIDE the punched hole so outer faces meet the cut edges.
  const leafClear = Math.max(clearW - thick * 2, 0.35);
  placeFrame(`${name}-jamb-l`, thick, doorH, jambDepth, -(half - thick / 2), doorH / 2);
  placeFrame(`${name}-jamb-r`, thick, doorH, jambDepth, half - thick / 2, doorH / 2);
  placeFrame(`${name}-lintel`, clearW, thick, jambDepth, 0, doorH - thick / 2);
  placeFrame(`${name}-sill`, clearW, 0.05, jambDepth + 0.02, 0, 0.025);

  const hinge = new TransformNode(`${name}-hinge`, scene);
  hinge.parent = parent;
  const hingeAlong = -(half - thick - 0.01);
  hinge.position.set(rx * r + tx * hingeAlong, y0, rz * r + tz * hingeAlong);
  hinge.rotation.y = rot;

  const leafW = Math.max(leafClear - 0.02, 0.3);
  const leaf = MeshBuilder.CreateBox(
    `${name}-leaf`,
    { width: leafW, height: doorH - thick - 0.08, depth: 0.04 },
    scene,
  );
  leaf.material = m.door;
  leaf.parent = hinge;
  leaf.position.set(leafW / 2, doorH / 2, 0);
  markWalkSurface(leaf);
  hinge.rotation.y = rot + openRad;

  return { clearA: angA, clearB: angB };
}

/**
 * Double door (main entrance / french). Two leaves hinged on outer jambs, open inward.
 * Clear span matches the punched wall cutout.
 */
function buildDoubleHingedDoor(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  name: string,
  r: number,
  angA: number,
  angB: number,
  y0: number,
  doorH: number,
  wallDepth: number,
  openRad: number,
  frameMat: ReturnType<typeof mats>["facade"],
): { clearA: number; clearB: number } {
  const { MeshBuilder, TransformNode } = bab;
  const mid = (angA + angB) / 2;
  const clearW = 2 * r * Math.sin((angB - angA) / 2);
  const thick = 0.08;
  const jambDepth = Math.max(wallDepth + 0.06, 0.16);
  const rot = -mid + Math.PI / 2;
  const tx = -Math.sin(mid);
  const tz = Math.cos(mid);
  const rx = Math.cos(mid);
  const rz = Math.sin(mid);
  const half = clearW / 2;
  const gap = 0.02;
  const leafW = Math.max((clearW - thick * 2 - gap) / 2 - 0.01, 0.3);

  const placeFrame = (
    n: string,
    w: number,
    h: number,
    d: number,
    along: number,
    yMid: number,
  ): void => {
    const box = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, scene);
    box.material = frameMat;
    box.parent = parent;
    box.position.set(rx * r + tx * along, y0 + yMid, rz * r + tz * along);
    box.rotation.y = rot;
    markWall(box);
  };

  placeFrame(`${name}-jamb-l`, thick, doorH, jambDepth, -(half - thick / 2), doorH / 2);
  placeFrame(`${name}-jamb-r`, thick, doorH, jambDepth, half - thick / 2, doorH / 2);
  placeFrame(`${name}-lintel`, clearW, thick, jambDepth, 0, doorH - thick / 2);
  placeFrame(`${name}-sill`, clearW, 0.06, jambDepth + 0.04, 0, 0.03);

  const makeLeaf = (side: -1 | 1, tag: string): void => {
    const hinge = new TransformNode(`${name}-hinge-${tag}`, scene);
    hinge.parent = parent;
    const hingeAlong = side * (half - thick - 0.01);
    hinge.position.set(rx * r + tx * hingeAlong, y0, rz * r + tz * hingeAlong);
    // Outer hinge: CW leaf swings opposite sign
    const swing = side < 0 ? openRad : -openRad;
    hinge.rotation.y = rot + swing;
    const leaf = MeshBuilder.CreateBox(
      `${name}-leaf-${tag}`,
      { width: leafW, height: doorH - 0.06, depth: 0.04 },
      scene,
    );
    leaf.material = m.door;
    leaf.parent = hinge;
    // Leaf grows toward center from hinge
    leaf.position.set(-side * (leafW / 2), doorH / 2, 0);
    markWalkSurface(leaf);
  };
  makeLeaf(-1, "l");
  makeLeaf(1, "r");

  return { clearA: angA, clearB: angB };
}

/**
 * Curved elevator door that slides into the cylindrical core wall (pocket open).
 * Leaf is an arc at wall radius; mostly hidden past the clear opening.
 */
function buildCurvedElevatorDoor(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  name: string,
  r: number,
  angA: number,
  angB: number,
  y0: number,
  doorH: number,
  wallDepth: number,
  frameMat: ReturnType<typeof mats>["facade"],
): void {
  const { MeshBuilder } = bab;
  const mid = (angA + angB) / 2;
  const clearW = 2 * r * Math.sin((angB - angA) / 2);
  const thick = 0.06;
  const jambDepth = Math.max(wallDepth + 0.04, 0.12);
  const rot = -mid + Math.PI / 2;
  const tx = -Math.sin(mid);
  const tz = Math.cos(mid);
  const rx = Math.cos(mid);
  const rz = Math.sin(mid);
  const half = clearW / 2;

  const placeFrame = (
    n: string,
    w: number,
    h: number,
    d: number,
    along: number,
    yMid: number,
  ): void => {
    const box = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, scene);
    box.material = frameMat;
    box.parent = parent;
    box.position.set(rx * r + tx * along, y0 + yMid, rz * r + tz * along);
    box.rotation.y = rot;
    markWall(box);
  };

  placeFrame(`${name}-jamb-l`, thick, doorH, jambDepth, -(half - thick / 2), doorH / 2);
  placeFrame(`${name}-jamb-r`, thick, doorH, jambDepth, half - thick / 2, doorH / 2);
  placeFrame(`${name}-lintel`, clearW, thick, jambDepth, 0, doorH - thick / 2);
  placeFrame(`${name}-sill`, clearW, 0.04, jambDepth, 0, 0.02);

  // Curved leaf slid CCW into the wall pocket (mostly disappeared).
  const leafArc = (angB - angA) * 0.95;
  const peek = 0.04; // tiny lip still visible in the opening
  const leafA0 = angB - peek;
  const leafA1 = leafA0 + leafArc;
  const leafR = r + wallDepth * 0.2;
  const segs = 14;
  for (let i = 0; i < segs; i++) {
    const a0 = leafA0 + (i / segs) * (leafA1 - leafA0);
    const a1 = leafA0 + ((i + 1) / segs) * (leafA1 - leafA0);
    placeArcPanel(
      scene,
      bab,
      parent,
      `${name}-leaf-${i}`,
      m.door,
      leafR,
      a0,
      a1,
      y0,
      0.03,
      doorH - 0.03,
      0.035,
      false, // leaf — open AABB must not block doorway; jambs stay walls
    );
  }

  // Pocket recess mark on the receiving jamb side (reads as door track)
  const track = MeshBuilder.CreateBox(
    `${name}-track`,
    { width: 0.03, height: doorH - 0.08, depth: wallDepth + 0.02 },
    scene,
  );
  track.material = frameMat;
  track.parent = parent;
  const trackMid = (angB + leafA1) / 2;
  track.position.set(
    Math.cos(angB) * (r + wallDepth * 0.35),
    y0 + doorH / 2,
    Math.sin(angB) * (r + wallDepth * 0.35),
  );
  track.rotation.y = -angB + Math.PI / 2;
  track.checkCollisions = false;
  void trackMid;
}


/** True core-tangent endpoints from outer edge, leaning toward `towardAng`. */
function coreTangentEnds(
  edgeAng: number,
  towardAng: number,
  coreR: number,
  outerR: number,
): { px: number; pz: number; tx: number; tz: number; span: number; ux: number; uz: number; phi: number } {
  const dlt = Math.acos(Math.min(1, Math.max(-1, coreR / outerR)));
  const toMid = Math.atan2(Math.sin(towardAng - edgeAng), Math.cos(towardAng - edgeAng));
  // Lean AWAY from mid so walls do not cross at 90° bedroom width.
  const phi = edgeAng - Math.sign(toMid || 1) * dlt;
  const px = Math.cos(edgeAng) * outerR;
  const pz = Math.sin(edgeAng) * outerR;
  const tx = Math.cos(phi) * coreR;
  const tz = Math.sin(phi) * coreR;
  const span = Math.hypot(px - tx, pz - tz);
  const ux = span > 1e-6 ? (tx - px) / span : 0;
  const uz = span > 1e-6 ? (tz - pz) / span : 0;
  return { px, pz, tx, tz, span, ux, uz, phi };
}

function sampleSegHeight(
  px: number,
  pz: number,
  tx: number,
  tz: number,
  y0: number,
  fallbackH: number,
  ceilAt?: (x: number, z: number) => number,
): number {
  if (!ceilAt) return fallbackH;
  let minTop = Infinity;
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    const yy = ceilAt(px + (tx - px) * t, pz + (tz - pz) * t);
    if (yy < minTop) minTop = yy;
  }
  return Math.max(fallbackH * 0.5, minTop - y0);
}

function sAtRadius(
  px: number,
  pz: number,
  ux: number,
  uz: number,
  span: number,
  targetR: number,
): number {
  let bestS = span * 0.5;
  let bestErr = Infinity;
  for (let k = 0; k <= 40; k++) {
    const s = (k / 40) * span;
    const err = Math.abs(Math.hypot(px + ux * s, pz + uz * s) - targetR);
    if (err < bestErr) {
      bestErr = err;
      bestS = s;
    }
  }
  return bestS;
}

/** Angle on the inner ring where an outer→core tangent crosses `innerR`. */
function tangentInnerAng(
  edgeAng: number,
  towardAng: number,
  coreR: number,
  innerR: number,
  outerR: number,
): number {
  const { px, pz, span, ux, uz } = coreTangentEnds(edgeAng, towardAng, coreR, outerR);
  const s = sAtRadius(px, pz, ux, uz, span, innerR);
  return Math.atan2(pz + uz * s, px + ux * s);
}

/** 2D intersection of lines (a0→a1) and (b0→b1); null if parallel. */
function lineIntersect2(
  a0x: number, a0z: number, a1x: number, a1z: number,
  b0x: number, b0z: number, b1x: number, b1z: number,
): { x: number; z: number } | null {
  const den = (a0x - a1x) * (b0z - b1z) - (a0z - a1z) * (b0x - b1x);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((a0x - b0x) * (b0z - b1z) - (a0z - b0z) * (b0x - b1x)) / den;
  return { x: a0x + t * (a1x - a0x), z: a0z + t * (a1z - a0z) };
}

/**
 * Straight wall on the INNER-cylinder tangent facing `towardAng` (bedroom|bath).
 * Spans between intersections with the two side lean-away tangents; kisses innerR.
 */
function buildFacingInnerTangentWall(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  material: ReturnType<typeof mats>["partition"],
  name: string,
  edgeA: number,
  edgeB: number,
  towardAng: number,
  coreR: number,
  innerR: number,
  outerR: number,
  y0: number,
  height: number,
  thick: number,
  ceilAt?: (x: number, z: number) => number,
): void {
  const { MeshBuilder, TransformNode } = bab;
  // Side walls still run outer→core; the facing wall is tangent to the inner cylinder.
  const A = coreTangentEnds(edgeA, towardAng, coreR, outerR);
  const B = coreTangentEnds(edgeB, towardAng, coreR, outerR);
  const cx = Math.cos(towardAng) * innerR;
  const cz = Math.sin(towardAng) * innerR;
  const dx = -Math.sin(towardAng);
  const dz = Math.cos(towardAng);
  const hitA = lineIntersect2(A.px, A.pz, A.tx, A.tz, cx - dx * 20, cz - dz * 20, cx + dx * 20, cz + dz * 20);
  const hitB = lineIntersect2(B.px, B.pz, B.tx, B.tz, cx - dx * 20, cz - dz * 20, cx + dx * 20, cz + dz * 20);
  if (!hitA || !hitB) return;
  const span = Math.hypot(hitB.x - hitA.x, hitB.z - hitA.z);
  if (span < 0.2) return;
  const ux = (hitB.x - hitA.x) / span;
  const uz = (hitB.z - hitA.z) / span;
  const h = sampleSegHeight(hitA.x, hitA.z, hitB.x, hitB.z, y0, height, ceilAt);
  const pad = 0.03;
  const root = new TransformNode(name, scene);
  root.parent = parent;
  root.position.set(hitA.x - ux * pad, y0, hitA.z - uz * pad);
  root.rotation.y = Math.atan2(ux, uz);
  const wall = MeshBuilder.CreateBox(
    `${name}-mesh`,
    { width: thick, height: h, depth: span + pad * 2 },
    scene,
  );
  wall.material = material;
  wall.parent = root;
  wall.position.set(0, h / 2, (span + pad * 2) / 2);
  markWall(wall);
}



/**
 * Solid outer→core true tangent (lean away / non-crossing). Local frame: outer flush, +Z toward core, kiss past contact.
 */
function buildCoreTangentWall(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  material: ReturnType<typeof mats>["partition"],
  name: string,
  edgeAng: number,
  towardAng: number,
  coreR: number,
  outerR: number,
  y0: number,
  height: number,
  thick: number,
  ceilAt?: (x: number, z: number) => number,
): void {
  const { MeshBuilder, TransformNode } = bab;
  const { px, pz, tx, tz, span, ux, uz } = coreTangentEnds(edgeAng, towardAng, coreR, outerR);
  if (span < 0.2) return;
  const kiss = 0.025;
  const h = sampleSegHeight(px, pz, tx, tz, y0, height, ceilAt);
  const root = new TransformNode(name, scene);
  root.parent = parent;
  root.position.set(px, y0, pz);
  root.rotation.y = Math.atan2(ux, uz);
  const wall = MeshBuilder.CreateBox(
    `${name}-mesh`,
    { width: thick, height: h, depth: span + kiss },
    scene,
  );
  wall.material = material;
  wall.parent = root;
  wall.position.set(0, h / 2, (span + kiss) / 2);
  markWall(wall);
}

/**
 * Living|bedroom separator on the toward-mid tangent at bedroom.a1:
 * one coplanar local-frame wall with bath + bedroom door cutouts.
 */
function buildLivingBedroomSeparator(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  floorIndex: number,
  edgeAng: number,
  towardAng: number,
  coreR: number,
  innerR: number,
  outerR: number,
  y0: number,
  wallH: number,
  thick: number,
  doorH: number,
  ceilAt?: (x: number, z: number) => number,
): void {
  const { MeshBuilder, TransformNode } = bab;
  const { px, pz, tx, tz, span, ux, uz } = coreTangentEnds(edgeAng, towardAng, coreR, outerR);
  if (span < 0.5) return;
  const kiss = 0.025;
  const h = sampleSegHeight(px, pz, tx, tz, y0, wallH, ceilAt);
  const root = new TransformNode(`sep-${floorIndex}`, scene);
  root.parent = parent;
  root.position.set(px, y0, pz);
  root.rotation.y = Math.atan2(ux, uz);

  const slab = (name: string, z0: number, z1: number, yBot: number, yTop: number): void => {
    if (z1 <= z0 + 0.02 || yTop <= yBot + 0.02) return;
    const box = MeshBuilder.CreateBox(
      name,
      { width: thick, height: yTop - yBot, depth: z1 - z0 },
      scene,
    );
    box.material = m.partition;
    box.parent = root;
    box.position.set(0, (yBot + yTop) / 2, (z0 + z1) / 2);
    markWall(box);
  };

  // Bedroom stretch = outer → inner-cylinder facing tangent; bath = that → core.
  const ca = Math.cos(towardAng);
  const sa = Math.sin(towardAng);
  const denom = ca * ux + sa * uz;
  const sFace =
    Math.abs(denom) > 1e-8
      ? (innerR - (ca * px + sa * pz)) / denom
      : span * 0.35;
  const sFaceClamped = Math.min(Math.max(sFace, DOOR_WIDTH + 0.2), span - DOOR_WIDTH - 0.2);
  const half = DOOR_WIDTH / 2;
  // Local +X after root rot is (uz, -ux); faces the room wedge when roomSign.
  const roomSign = Math.sign(uz * ca + -ux * sa) || 1;
  // From living looking into the rooms: right along the wall is −roomSign · (+s).
  const alongRight = -roomSign;
  const halfBath = DOOR_WIDTH_BATH / 2;
  // Bath door mid-bath stretch, then 1 m to the right (from living).
  let sBath = Math.min(
    span - halfBath - 0.08,
    Math.max(sFaceClamped + halfBath + 0.1, (sFaceClamped + span) * 0.5),
  );
  sBath = Math.min(
    span - halfBath - 0.08,
    Math.max(sFaceClamped + halfBath + 0.1, sBath + alongRight * 1.0),
  );
  // Bedroom door centered on the bedroom wall section
  const sBed = Math.max(half + 0.06, sFaceClamped * 0.5);
  const gaps: { s: number; tag: string; halfW: number; hingeRight: boolean }[] = [
    { s: sBath, tag: "bath", halfW: halfBath, hingeRight: true },
    { s: sBed, tag: "bed", halfW: half, hingeRight: false },
  ];
  gaps.sort((a, b) => a.s - b.s);

  let zCur = 0;
  let panel = 0;
  for (const g of gaps) {
    const g0 = Math.max(0, g.s - g.halfW);
    const g1 = Math.min(span, g.s + g.halfW);
    slab(`sep-${floorIndex}-p${panel++}`, zCur, g0, 0, h);
    slab(`sep-${floorIndex}-head-${g.tag}`, g0, g1, doorH, h);

    const jambT = 0.06;
    const jambD = Math.max(thick + 0.02, 0.1);
    const mkFrame = (
      name: string,
      zMid: number,
      yMid: number,
      w: number,
      hh: number,
      d: number,
    ): void => {
      const box = MeshBuilder.CreateBox(name, { width: w, height: hh, depth: d }, scene);
      box.material = m.partition;
      box.parent = root;
      box.position.set(0, yMid, zMid);
      markWall(box);
    };
    mkFrame(`sep-${g.tag}-jamb-l-${floorIndex}`, g0 + jambT / 2, doorH / 2, jambD, doorH, jambT);
    mkFrame(`sep-${g.tag}-jamb-r-${floorIndex}`, g1 - jambT / 2, doorH / 2, jambD, doorH, jambT);
    mkFrame(
      `sep-${g.tag}-lintel-${floorIndex}`,
      (g0 + g1) / 2,
      doorH + jambT / 2,
      jambD,
      jambT,
      Math.max(0.1, g1 - g0 - 0.02),
    );

    // Hinge on living face; swing into the room. Bath: hinge on the right jamb.
    const hinge = new TransformNode(`sep-${g.tag}-hinge-${floorIndex}`, scene);
    hinge.parent = root;
    hinge.position.set(-roomSign * (thick / 2 + 0.01), 0, 0);
    const leafW = g.halfW * 2 - 0.04;
    const hingeAtHighS = g.hingeRight ? alongRight > 0 : false;
    hinge.position.z = g.hingeRight
      ? hingeAtHighS
        ? g1 - 0.02
        : g0 + 0.02
      : g0 + 0.02;
    // Bath swings inward, but short of the core; bedroom into the bedroom.
    const openRad = g.tag === "bath" ? 0.75 : 1.2; // bath ~43°, bedroom ~69°
    hinge.rotation.y = (g.tag === "bath" ? -roomSign : roomSign) * openRad;
    const leaf = MeshBuilder.CreateBox(
      `sep-${g.tag}-leaf-${floorIndex}`,
      { width: 0.04, height: doorH - 0.08, depth: leafW },
      scene,
    );
    leaf.material = m.door;
    leaf.parent = hinge;
    leaf.position.set(
      0,
      doorH / 2,
      g.hingeRight && hingeAtHighS ? -leafW / 2 : leafW / 2,
    );
    markWalkSurface(leaf);

    zCur = g1;
  }
  slab(`sep-${floorIndex}-p${panel}`, zCur, span + kiss, 0, h);
}



/** 1 m cartesian grid on a circular floor (clipped to radius). */
function buildFloorMeterGrid(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  name: string,
  yTop: number,
  radius: number,
): void {
  const { MeshBuilder, Color3, Vector3 } = bab;
  if (!Vector3) return;
  const y = yTop + 0.012;
  const color = new Color3(0.4, 0.4, 0.38);
  const r2 = radius * radius;
  const lim = Math.floor(radius - 0.02);
  const add = (id: string, ax: number, az: number, bx: number, bz: number): void => {
    const line = MeshBuilder.CreateLines(
      id,
      { points: [new Vector3(ax, y, az), new Vector3(bx, y, bz)] },
      scene,
    );
    line.color = color;
    line.parent = parent;
    line.isPickable = false;
  };
  for (let i = -lim; i <= lim; i++) {
    const extent = Math.sqrt(Math.max(0, r2 - i * i));
    if (extent < 0.08) continue;
    add(`${name}-gx-${i}`, i, -extent, i, extent);
    add(`${name}-gz-${i}`, -extent, i, extent, i);
  }
}

/** Nested floor plan: outer Ø15, inner Ø6.5, elevator core Ø3 (m). */
const CORE_D = 3;
const INNER_WALL_D = 6.5; // corridor ≈1.75 m clear; rooms ≈4.25 m deep
const OUTER_WALL_D = TOWER_SPEC.innerDiameter; // 15
const FACADE_R = OUTER_WALL_D / 2; // 7.5

/** Exterior wrap stair: +1 = CCW ascending; keep forever. */
const STAIR_HAND = 1;
const ENTRANCE_ROT_PER_FLOOR = Math.PI / 4; // 45° — longer run, gentler pitch
function floorYaw(floorIndex: number): number {
  return STAIR_HAND * floorIndex * ENTRANCE_ROT_PER_FLOOR;
}
const STAIR_R = OUTER_R - 0.55; // balcony centerline (~9.45)
const LANDING_CLEAR_W = 2.2; // door-front clear on continuous slab (landing = slab)
const RISER = FH / 24; // 24 × ~0.146 = 3.5 — less steep than 20×0.175
const SLAB_H = 0.22;
const TREAD_RADIAL = 1.1;
/** Half-angle of slab stair cut (4× tread-band) — 2× longer again along the arc. */
const STAIR_CUT_HALF = 4 * Math.atan2(TREAD_RADIAL * 0.5, STAIR_R); // 2× longer again

/** Stair / balcony rail — shared so flight, gate, and balcony joints line up. */
const RAIL_H = 1.1;
const RAIL_R_OUT = OUTER_R; // slab lip — was OUTER_R - 0.2 (looked ~20 cm inset)
const RAIL_R_IN = STAIR_R - TREAD_RADIAL / 2 - 0.05;
const RAIL_POST = 0.04;
const RAIL_TOP = 0.05;
function gateHalfAng(): number {
  return Math.atan2(LANDING_CLEAR_W / 2, RAIL_R_OUT);
}

/** Shared flight geometry for buildFlight + walkSurfaceY (local slabTop; walk adds gy). */
function flightAngles(floorIndex: number): {
  mainAng: number;
  clear: number;
  startAng: number;
  endAng: number;
  nRisers: number;
  dAng: number;
  slabTop: number;
} {
  const mainAng = Math.PI / 2 + floorYaw(floorIndex);
  const clear = gateHalfAng();
  const startAng = mainAng + STAIR_HAND * clear;
  const endAng = mainAng + STAIR_HAND * ENTRANCE_ROT_PER_FLOOR - STAIR_HAND * clear;
  const nRisers = Math.round(FH / RISER);
  const dAng = (endAng - startAng) / nRisers;
  const slabTop = floorIndex * FH + SLAB_H;
  return { mainAng, clear, startAng, endAng, nRisers, dAng, slabTop };
}

function angOnFlightSpan(ang: number, startAng: number, endAng: number): boolean {
  const fromStart = angNormDiff(ang, startAng);
  const span = angNormDiff(endAng, startAng);
  if (Math.abs(span) < 1e-6) return false;
  return span > 0
    ? fromStart >= -0.02 && fromStart <= span + 0.02
    : fromStart <= 0.02 && fromStart >= span - 0.02;
}

function angNormDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

type FloorInteriorOpts = {
  /** When set (top floor), demising / core / outer shell rise to this ceiling. */
  ceilingAt?: (x: number, z: number) => number;
  /** Outer shell top Y (absolute). Defaults to y0 + facadeTop. Mid floors: next slab underside. */
  shellTopY?: number;
};

/**
 * Three nested cylinders + 8 pie slices between inner (Ø6.5) and outer (Ø15):
 * 4× one-slice rooms, 2× two-slice rooms. Elevator (Ø3) has one sliding door toward +Z entrance.
 */
function buildFloorInterior(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  floorIndex: number,
  y0: number,
  opts: FloorInteriorOpts = {},
): void {
  const { MeshBuilder } = bab;
  const roomH = Math.min(FH - 0.4, 3.1);
  const facadeTop = roomH * 0.92;
  const wallH = roomH; // full storey (partitions + tangents)
  const shellTopY = opts.shellTopY ?? y0 + facadeTop;
  const ceilAt = opts.ceilingAt;

  const coreR = CORE_D / 2; // 1.5
  const innerR = INNER_WALL_D / 2; // 3.25 — corridor / room face
  const outerR = OUTER_WALL_D / 2; // 7.5 — facade
  const wallDepth = 0.14;
  const partT = 0.08;
  const yaw = floorYaw(floorIndex);
  const mainAng = Math.PI / 2 + yaw;

  const markSolid = (mesh: CollisionMesh): void => {
    markWall(mesh);
  };

  // --- Elevator core (Ø3), punched + sliding door (yawed with floor) ---
  let coreTopY = y0 + roomH;
  if (ceilAt) {
    let minU = Infinity;
    for (const rr of [0, coreR * 0.5, coreR]) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const yy = ceilAt(Math.cos(a) * rr, Math.sin(a) * rr);
        if (yy < minU) minU = yy;
      }
    }
    coreTopY = minU;
  }
  const coreH = Math.max(0.5, coreTopY - y0);

  const ELEV_ANG = Math.PI / 2 + (2 * Math.PI) / 3 + yaw; // 120° right of entrance, opposite bath
  const elevCut = makeDoorCut(coreR, ELEV_ANG, 0.9, DOOR_HEIGHT);
  buildPunchedCylinderWall(
    scene,
    bab,
    parent,
    m.partition,
    `elev-shell-${floorIndex}`,
    coreR,
    y0,
    y0 + coreH,
    0.1,
    [elevCut],
    ceilAt,
  );

  buildCurvedElevatorDoor(
    scene,
    bab,
    parent,
    m,
    `elev-door-${floorIndex}`,
    coreR,
    elevCut.a0,
    elevCut.a1,
    y0,
    elevCut.h1,
    0.1,
    m.partition,
  );

  // --- Walk-in: bedroom left of living; living door at mainAng; topology locked + yaw ---
  const slice = Math.PI / 4;
  type RoomDef = {
    a0: number;
    a1: number;
    slices: 1 | 2;
    kind: "large" | "small";
    role: "living" | "bedroom" | "small";
  };
  const bedA0 = -Math.PI / 4 + yaw;
  const bedA1 = Math.PI / 4 + yaw;
  const bedAmid = yaw; // bedroom mid (baseline +X)
  const innerA0 = tangentInnerAng(bedA0, bedAmid, coreR, innerR, outerR);
  const innerA1 = tangentInnerAng(bedA1, bedAmid, coreR, innerR, outerR);
  // Four smalls, 45° each, packed so last small's far edge meets the a0 tangent at innerR
  // (clockwise of the old 315° end). Living fills bedA1 → first small.
  const smallW = slice;
  // Pack four smalls ending at the a0-tangent inner crossing (clockwise of old 315°).
  let firstSmallA0 = innerA0 - 4 * smallW;
  if (firstSmallA0 < bedA1) firstSmallA0 += Math.PI * 2; // keep CCW living span
  const lastSmallA1 = firstSmallA0 + 4 * smallW;
  const rooms: RoomDef[] = [
    { a0: bedA0, a1: bedA1, slices: 2, kind: "large", role: "bedroom" },
    { a0: bedA1, a1: firstSmallA0, slices: 2, kind: "large", role: "living" },
  ];
  for (let k = 0; k < 4; k++) {
    const a0 = firstSmallA0 + k * smallW;
    rooms.push({ a0, a1: a0 + smallW, slices: 1, kind: "small", role: "small" });
  }
  const bedroom = rooms[0]!;
  const corridorOpenings: WallOpening[] = [];
  const facadeOpenings: WallOpening[] = [];
  const doorH = DOOR_HEIGHT;

  const demiseHeight = (ang: number, r0: number, r1: number): number => {
    let demiseH = wallH;
    if (ceilAt) {
      let minTop = Infinity;
      const len = r1 - r0;
      for (let k = 0; k <= 6; k++) {
        const rr = r0 + (len * k) / 6;
        const yy = ceilAt(Math.cos(ang) * rr, Math.sin(ang) * rr);
        if (yy < minTop) minTop = yy;
      }
      demiseH = Math.max(wallH * 0.5, minTop - y0);
    }
    return demiseH;
  };

  const buildRadialDemise = (ang: number, r0: number, r1: number, tag: string): void => {
    const len = r1 - r0 + 0.04;
    const demiseH = demiseHeight(ang, r0, r1);
    const wall = MeshBuilder.CreateBox(
      tag,
      { width: partT, height: demiseH, depth: len },
      scene,
    );
    wall.material = m.partition;
    wall.parent = parent;
    const r = (r0 + r1) / 2;
    wall.position.set(Math.cos(ang) * r, y0 + demiseH / 2, Math.sin(ang) * r);
    wall.rotation.y = -ang + Math.PI / 2;
    markSolid(wall);
  };

  // Lean-away core tangents (contacts ~±123.5°; core = blunt tip); full storey height
  buildCoreTangentWall(
    scene, bab, parent, m.partition, `bed-tangent-${floorIndex}-a0`,
    bedroom.a0, bedAmid, coreR, outerR, y0, wallH, partT, ceilAt,
  );
  buildLivingBedroomSeparator(
    scene, bab, parent, m, floorIndex,
    bedroom.a1, bedAmid, coreR, innerR, outerR, y0, wallH, partT, doorH, ceilAt,
  );
  // Straight inner-cylinder tangent replaces the curved bedroom|bath arc
  buildFacingInnerTangentWall(
    scene, bab, parent, m.partition, `bed-bath-tangent-${floorIndex}`,
    bedroom.a0, bedroom.a1, bedAmid, coreR, innerR, outerR, y0, wallH, partT, ceilAt,
  );
  // Punch out that inner-cylinder arc so only the straight tangent remains
  {
    const arc = snapOpeningToWallSegs(innerA0, innerA1);
    corridorOpenings.push({ a0: arc.a0, a1: arc.a1, h0: 0, h1: wallH + 0.05 });
  }
  // Close last small on the inner-crossing angle (meets a0 tangent at innerR)
  buildRadialDemise(lastSmallA1, innerR, outerR, `demise-last-${floorIndex}`);

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]!;
    const amid = (room.a0 + room.a1) / 2;
    const isLiving = room.role === "living";
    const isBedroom = room.role === "bedroom";

    const skipRadial =
      Math.abs(Math.atan2(Math.sin(room.a0 - bedroom.a0), Math.cos(room.a0 - bedroom.a0))) < 1e-6 ||
      Math.abs(Math.atan2(Math.sin(room.a0 - bedroom.a1), Math.cos(room.a0 - bedroom.a1))) < 1e-6;
    if (!skipRadial) {
      buildRadialDemise(room.a0, innerR, outerR, `demise-${floorIndex}-${i}`);
    }

    if (isLiving) {
      // Inner punch: tangent inner-cross → first small (not the outer bedroom edge)
      const livingOpen = snapOpeningInward(innerA1, firstSmallA0);
      corridorOpenings.push({
        a0: livingOpen.a0,
        a1: livingOpen.a1,
        h0: 0,
        h1: wallH + 0.05,
      });
    } else if (!isBedroom) {
      const unitCut = makeDoorCut(innerR, amid, DOOR_WIDTH, doorH);
      buildHingedDoor(
        scene, bab, parent, m, `unit-door-${floorIndex}-${i}`,
        innerR, unitCut.a0, unitCut.a1, y0, unitCut.h1, partT, OPEN_CORRIDOR, m.partition,
      );
      corridorOpenings.push(unitCut);
    }

    {
      const nWin = isLiving || isBedroom ? 3 : 2;
      const slots = equalFacadeMids(room.a0, room.a1, nWin + 1);
      const preferDoor = isLiving ? mainAng : (room.a0 + room.a1) / 2;
      let doorIdx = 0;
      let best = Infinity;
      for (let s = 0; s < slots.length; s++) {
        const d = Math.abs(angNormDiff(slots[s]!, preferDoor));
        if (d < best) {
          best = d;
          doorIdx = s;
        }
      }
      const doorMid = slots[doorIdx]!;
      if (isLiving) {
        const mainCut = makeDoorCut(outerR, mainAng, DOOR_WIDTH_DOUBLE, DOOR_HEIGHT);
        buildDoubleHingedDoor(
          scene, bab, parent, m, `main-door-${floorIndex}`,
          outerR, mainCut.a0, mainCut.a1, y0, mainCut.h1, wallDepth, OPEN_FACADE, m.wall,
        );
        facadeOpenings.push(mainCut);
      } else {
        const balcCut = makeDoorCut(outerR, doorMid, DOOR_WIDTH, doorH);
        buildHingedDoor(
          scene, bab, parent, m, `balc-door-${floorIndex}-${i}`,
          outerR, balcCut.a0, balcCut.a1, y0, balcCut.h1, wallDepth, OPEN_FACADE, m.wall,
        );
        facadeOpenings.push(balcCut);
      }
      let wi = 0;
      for (let s = 0; s < slots.length; s++) {
        if (s === doorIdx) continue;
        let slot = slots[s]!;
        // Don't overlap living main door cut
        if (isLiving && Math.abs(angNormDiff(slot, mainAng)) < angHalf(outerR, DOOR_WIDTH_DOUBLE) + 0.05) {
          slot = mainAng + (angNormDiff(slot, mainAng) >= 0 ? 1 : -1) * (angHalf(outerR, DOOR_WIDTH_DOUBLE) + 0.14);
        }
        let sill = WINDOW_SILL;
        let head = WINDOW_SILL + WINDOW_HEIGHT;
        if (ceilAt) {
          const wx = Math.cos(slot) * outerR;
          const wz = Math.sin(slot) * outerR;
          const clear = ceilAt(wx, wz) - y0;
          if (clear < 1.2) continue; // pitched roof too low — skip
          if (clear < head + 0.08) head = Math.max(sill + 0.5, clear - 0.08);
        }
        const cut = makeWindowCut(outerR, slot, WINDOW_WIDTH, sill, head - sill);
        buildFacadeWindow(
          scene, bab, parent, m, `win-${floorIndex}-${i}-${wi++}`,
          outerR, cut.a0, cut.a1, y0, cut.h0, cut.h1, wallDepth,
        );
        facadeOpenings.push(cut);
      }
    }

    if (isBedroom) {
      const bedW = 1.8;
      const bedD = 2.1;
      const bed = MeshBuilder.CreateBox(
        `bed-${floorIndex}-bedroom`,
        { width: bedW, height: 0.4, depth: bedD },
        scene,
      );
      bed.material = m.furni;
      bed.parent = parent;
      const habR = (innerR + outerR) / 2;
      bed.position.set(Math.cos(amid) * habR, y0 + 0.2, Math.sin(amid) * habR);
      bed.rotation.y = -amid + Math.PI / 2;
      markSolid(bed);
    } else if (room.role === "small") {
      const bedW = 1.0;
      const bedD = 2.0;
      const bed = MeshBuilder.CreateBox(
        `bed-${floorIndex}-${i}`,
        { width: bedW, height: 0.4, depth: bedD },
        scene,
      );
      bed.material = m.furni;
      bed.parent = parent;
      const bedAng = room.a1 - angHalf(outerR, bedW) - 0.04;
      const bedR = outerR - wallDepth / 2 - bedD / 2 - 0.06;
      bed.position.set(Math.cos(bedAng) * bedR, y0 + 0.2, Math.sin(bedAng) * bedR);
      bed.rotation.y = -bedAng + Math.PI / 2;
      markSolid(bed);
    }
  }

  // Bath wedge: empty (no fixtures)

  // Inner Ø6.5 corridor cylinder — room doors only
  buildPunchedCylinderWall(
    scene,
    bab,
    parent,
    m.partition,
    `inner-shell-${floorIndex}`,
    innerR,
    y0,
    y0 + wallH,
    partT,
    corridorOpenings,
    undefined,
  );

  // Outer Ø15 facade
  buildPunchedCylinderWall(
    scene,
    bab,
    parent,
    m.wall,
    `facade-shell-${floorIndex}`,
    outerR,
    y0,
    shellTopY,
    wallDepth,
    facadeOpenings,
    ceilAt,
  );

  // Gate newels + balcony rail on OD — newels on every floor (incl. 0); full loop above grade
  {
    const g = gateHalfAng();
    const aL = mainAng - STAIR_HAND * g; // arrival
    const aR = mainAng + STAIR_HAND * g; // departure

    const placeGateNewel = (a: number, tag: string): void => {
      const post = MeshBuilder.CreateBox(
        `rail-gate-${floorIndex}-${tag}`,
        { width: RAIL_POST, height: RAIL_H, depth: RAIL_POST },
        scene,
      );
      post.material = m.rail;
      post.parent = parent;
      post.position.set(Math.cos(a) * RAIL_R_OUT, y0 + RAIL_H / 2, Math.sin(a) * RAIL_R_OUT);
      markSolid(post);
    };
    placeGateNewel(aL, "L");
    placeGateNewel(aR, "R");

    // Floor 0: gate newels only (balcony loop partial); upper floors: ring butts newels
    if (floorIndex > 0) {
      const postAngs: number[] = [];
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        if (Math.abs(angNormDiff(a, mainAng)) < g) continue;
        postAngs.push(a);
        const post = MeshBuilder.CreateBox(
          `rail-post-${floorIndex}-${i}`,
          { width: RAIL_POST, height: RAIL_H, depth: RAIL_POST },
          scene,
        );
        post.material = m.rail;
        post.parent = parent;
        post.position.set(Math.cos(a) * RAIL_R_OUT, y0 + RAIL_H / 2, Math.sin(a) * RAIL_R_OUT);
        markSolid(post);
      }

      const placeTopSeg = (a0: number, a1: number, tag: string): void => {
        const span = angNormDiff(a1, a0);
        if (Math.abs(span) <= 0.02 || Math.abs(span) > Math.PI / 4) return;
        const mid = a0 + span / 2;
        const chord = 2 * RAIL_R_OUT * Math.sin(Math.abs(span) / 2);
        const top = MeshBuilder.CreateBox(
          `rail-top-${floorIndex}-${tag}`,
          { width: chord, height: RAIL_TOP, depth: RAIL_TOP },
          scene,
        );
        top.material = m.rail;
        top.parent = parent;
        top.position.set(Math.cos(mid) * RAIL_R_OUT, y0 + RAIL_H, Math.sin(mid) * RAIL_R_OUT);
        top.rotation.y = -mid + Math.PI / 2;
        markSolid(top);
      };

      // Segmented top rail along balcony; gap exactly aL…aR (butts gate newels)
      for (let i = 0; i < postAngs.length; i++) {
        const a0 = postAngs[i]!;
        const a1 = postAngs[(i + 1) % postAngs.length]!;
        const span = angNormDiff(a1, a0);
        if (span <= 0.02 || span > Math.PI / 4) continue; // skip gate wrap
        placeTopSeg(a0, a1, `p${i}`);
      }
      // Butt ring to gate newels (nearest post on each lip)
      if (postAngs.length > 0) {
        let bestToR = postAngs[0]!;
        let bestToL = postAngs[0]!;
        let dR = Infinity;
        let dL = Infinity;
        for (const a of postAngs) {
          const towardBalconyFromR = STAIR_HAND * angNormDiff(a, aR);
          if (towardBalconyFromR > 0 && towardBalconyFromR < dR) {
            dR = towardBalconyFromR;
            bestToR = a;
          }
          const towardBalconyToL = STAIR_HAND * angNormDiff(aL, a);
          if (towardBalconyToL > 0 && towardBalconyToL < dL) {
            dL = towardBalconyToL;
            bestToL = a;
          }
        }
        if (dR < Math.PI / 4) placeTopSeg(aR, bestToR, "buttR");
        if (dL < Math.PI / 4) placeTopSeg(bestToL, aL, "buttL");
      }
    }
  }
}



/**
 * Solid annular-sector prism (VertexData) for CSG stair cutters.
 * Angles in XZ; height centered on yCenter. Not a chain of boxes.
 */
function createAnnularSectorMesh(
  name: string,
  scene: Scene,
  rInner: number,
  rOuter: number,
  ang0: number,
  ang1: number,
  yCenter: number,
  height: number,
  segments = 32,
): Mesh {
  const yBot = yCenter - height / 2;
  const yTop = yCenter + height / 2;
  const n = Math.max(2, segments);
  const positions: number[] = [];
  const indices: number[] = [];

  // Per sample i: botInner, botOuter, topInner, topOuter
  for (let i = 0; i <= n; i++) {
    const a = ang0 + ((ang1 - ang0) * i) / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    positions.push(c * rInner, yBot, s * rInner);
    positions.push(c * rOuter, yBot, s * rOuter);
    positions.push(c * rInner, yTop, s * rInner);
    positions.push(c * rOuter, yTop, s * rOuter);
  }

  const bi = (i: number) => i * 4;
  const bo = (i: number) => i * 4 + 1;
  const ti = (i: number) => i * 4 + 2;
  const to = (i: number) => i * 4 + 3;

  for (let i = 0; i < n; i++) {
    // Bottom (-Y), top (+Y), inner wall, outer wall
    indices.push(bi(i), bo(i + 1), bo(i), bi(i), bi(i + 1), bo(i + 1));
    indices.push(ti(i), to(i), to(i + 1), ti(i), to(i + 1), ti(i + 1));
    indices.push(bi(i), ti(i), ti(i + 1), bi(i), ti(i + 1), bi(i + 1));
    indices.push(bo(i), bo(i + 1), to(i + 1), bo(i), to(i + 1), to(i));
  }
  // Radial end caps at ang0 / ang1
  indices.push(bi(0), bo(0), to(0), bi(0), to(0), ti(0));
  indices.push(bi(n), ti(n), to(n), bi(n), to(n), bo(n));

  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  const mesh = new Mesh(name, scene);
  vd.applyToMesh(mesh);
  return mesh;
}

/** Floor slab: one OUTER_R disc with elevator core + stair-width opening left of door. */
function buildFloorSlab(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  name: string,
  y0: number,
  slabH: number,
  floorIndex: number,
): void {
  const { MeshBuilder } = bab;
  const yC = y0 + slabH / 2;
  const cutH = slabH * 1.25;

  // Temps in parent-local space (unparented); CSG.FromMesh(..., true) keeps world≡local verts.
  const disc = MeshBuilder.CreateCylinder(
    `${name}-disc-src`,
    { height: slabH, diameter: 2 * OUTER_R, tessellation: 64 },
    scene,
  );
  disc.position.y = yC;
  disc.isVisible = false;

  const elev = MeshBuilder.CreateCylinder(
    `${name}-elev-cut`,
    { height: cutH, diameter: CORE_D + 0.1, tessellation: 48 },
    scene,
  );
  elev.position.y = yC;
  elev.isVisible = false;

  // Stair-width cut left of door (CW / decreasing angle when door faces +Z):
  // continuous slab in front of door IS the landing — do not cut the door clear zone.
  const mainAng = Math.PI / 2 + floorYaw(floorIndex);
  const doorClearHalf = gateHalfAng();
  const stairCutHalf = STAIR_CUT_HALF;
  const cutMid = mainAng - doorClearHalf - stairCutHalf;
  const ang0 = cutMid - stairCutHalf;
  const ang1 = cutMid + stairCutHalf;
  const rCutIn = STAIR_R - TREAD_RADIAL / 2;
  const rCutOut = STAIR_R + TREAD_RADIAL / 2;

  const stairCut = createAnnularSectorMesh(
    `${name}-stair-cut`,
    scene,
    rCutIn,
    rCutOut,
    ang0,
    ang1,
    yC,
    cutH,
    16,
  );
  stairCut.isVisible = false;

  // Temps stay unparented in parent-local coords (parent at stage origin).
  parent.computeWorldMatrix(true);
  disc.computeWorldMatrix(true);
  elev.computeWorldMatrix(true);
  stairCut.computeWorldMatrix(true);

  const result = CSG.FromMesh(disc, true)
    .subtract(CSG.FromMesh(elev, true))
    .subtract(CSG.FromMesh(stairCut, true))
    .toMesh(name, m.floor, scene);

  disc.dispose();
  elev.dispose();
  stairCut.dispose();

  // CSG.FromMesh may copy source positions onto result — zero after parenting.
  result.parent = parent;
  result.position.set(0, 0, 0);
  result.rotation.set(0, 0, 0);
  result.scaling.set(1, 1, 1);
  markWalkSurface(result);
}

/** Helical flight outside facade from floor i to i+1; skips gate clear at both ends. */
function buildFlight(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  floorIndex: number,
  slabTopY: number,
): void {
  const { MeshBuilder } = bab;
  const { mainAng, clear, startAng, endAng, nRisers, dAng } = flightAngles(floorIndex);
  const treadH = 0.05;
  const slabTopNext = slabTopY + FH;
  const samples: { ang: number; yTread: number }[] = [];

  for (let s = 0; s < nRisers; s++) {
    const mid = startAng + dAng * (s + 0.5);
    // Safety: start/end already exclude door clear
    if (Math.abs(angNormDiff(mid, mainAng)) < clear - 0.001) continue;
    const yTop = slabTopY + RISER * (s + 1);
    const run = Math.max(0.28, 2 * STAIR_R * Math.sin(Math.abs(dAng) / 2) * 1.2);
    const tread = MeshBuilder.CreateBox(
      `stair-tread-${floorIndex}-${s}`,
      { width: run, height: treadH, depth: TREAD_RADIAL },
      scene,
    );
    tread.material = m.door;
    tread.parent = parent;
    tread.position.set(
      Math.cos(mid) * STAIR_R,
      yTop - treadH / 2,
      Math.sin(mid) * STAIR_R,
    );
    tread.rotation.y = -mid + Math.PI / 2;
    markWalkSurface(tread);
    samples.push({ ang: mid, yTread: yTop });
  }

  const placeRailPost = (
    name: string,
    ang: number,
    r: number,
    yCenter: number,
  ): void => {
    const post = MeshBuilder.CreateBox(
      name,
      { width: RAIL_POST, height: RAIL_H, depth: RAIL_POST },
      scene,
    );
    post.material = m.rail;
    post.parent = parent;
    post.position.set(Math.cos(ang) * r, yCenter, Math.sin(ang) * r);
    markWall(post);
  };

  const placeRailTop = (
    name: string,
    a0: number,
    y0: number,
    r0: number,
    a1: number,
    y1: number,
    r1: number,
  ): void => {
    const x0 = Math.cos(a0) * r0;
    const z0 = Math.sin(a0) * r0;
    const x1 = Math.cos(a1) * r1;
    const z1 = Math.sin(a1) * r1;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.02) return;
    const top = MeshBuilder.CreateBox(
      name,
      { width: len, height: RAIL_TOP, depth: RAIL_TOP },
      scene,
    );
    top.material = m.rail;
    top.parent = parent;
    top.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    // Aim +X of box along segment (yaw about Y, then pitch about local Z)
    top.rotation.y = -Math.atan2(dz, dx);
    top.rotation.z = Math.atan2(dy, Math.hypot(dx, dz));
    markWall(top);
  };

  // --- Outer rail (RAIL_R_OUT): connects balcony gate newels ---
  // Start/end newels live on the slabs (buildFloorInterior); helix posts on treads.
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    placeRailPost(
      `stair-rail-out-post-${floorIndex}-${i}`,
      s.ang,
      RAIL_R_OUT,
      s.yTread + RAIL_H / 2,
    );
  }
  if (samples.length > 0) {
    const first = samples[0]!;
    const last = samples[samples.length - 1]!;
    // First segment: departure newel → first tread; last: last tread → arrival newel
    placeRailTop(
      `stair-rail-out-top-${floorIndex}-start`,
      startAng,
      slabTopY + RAIL_H,
      RAIL_R_OUT,
      first.ang,
      first.yTread + RAIL_H,
      RAIL_R_OUT,
    );
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i]!;
      const b = samples[i + 1]!;
      placeRailTop(
        `stair-rail-out-top-${floorIndex}-${i}`,
        a.ang,
        a.yTread + RAIL_H,
        RAIL_R_OUT,
        b.ang,
        b.yTread + RAIL_H,
        RAIL_R_OUT,
      );
    }
    placeRailTop(
      `stair-rail-out-top-${floorIndex}-end`,
      last.ang,
      last.yTread + RAIL_H,
      RAIL_R_OUT,
      endAng,
      slabTopNext + RAIL_H,
      RAIL_R_OUT,
    );
  }

  // --- Inner rail (RAIL_R_IN): same helix; slab posts at start/end ---
  placeRailPost(
    `stair-rail-in-post-${floorIndex}-start`,
    startAng,
    RAIL_R_IN,
    slabTopY + RAIL_H / 2,
  );
  placeRailPost(
    `stair-rail-in-post-${floorIndex}-end`,
    endAng,
    RAIL_R_IN,
    slabTopNext + RAIL_H / 2,
  );
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    placeRailPost(
      `stair-rail-in-post-${floorIndex}-${i}`,
      s.ang,
      RAIL_R_IN,
      s.yTread + RAIL_H / 2,
    );
  }
  if (samples.length > 0) {
    const first = samples[0]!;
    const last = samples[samples.length - 1]!;
    placeRailTop(
      `stair-rail-in-top-${floorIndex}-start`,
      startAng,
      slabTopY + RAIL_H,
      RAIL_R_IN,
      first.ang,
      first.yTread + RAIL_H,
      RAIL_R_IN,
    );
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i]!;
      const b = samples[i + 1]!;
      placeRailTop(
        `stair-rail-in-top-${floorIndex}-${i}`,
        a.ang,
        a.yTread + RAIL_H,
        RAIL_R_IN,
        b.ang,
        b.yTread + RAIL_H,
        RAIL_R_IN,
      );
    }
    placeRailTop(
      `stair-rail-in-top-${floorIndex}-end`,
      last.ang,
      last.yTread + RAIL_H,
      RAIL_R_IN,
      endAng,
      slabTopNext + RAIL_H,
      RAIL_R_IN,
    );
  }

}

/** Cheap neighbor silhouette: unpunched facade + slab discs + solar (no interiors/stairs). */
function buildRiseStageLod(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  floors: number,
): void {
  const { MeshBuilder } = bab;
  const h = floors * FH;
  const facade = MeshBuilder.CreateCylinder(
    "lod-facade",
    { height: h, diameter: 2 * FACADE_R, tessellation: 20 },
    scene,
  );
  facade.parent = parent;
  facade.position.y = h / 2;
  facade.material = m.facade;
  facade.isPickable = false;
  facade.doNotSyncBoundingInfo = true;

  for (let i = 0; i <= floors; i++) {
    const slab = MeshBuilder.CreateCylinder(
      `lod-slab-${i}`,
      { height: SLAB_H, diameter: 2 * OUTER_R, tessellation: 20 },
      scene,
    );
    slab.parent = parent;
    slab.position.y = i * FH + SLAB_H / 2;
    slab.material = m.floor;
    slab.isPickable = false;
    slab.doNotSyncBoundingInfo = true;
  }

  const columnTop = EXCAVATE_COLUMN_TOP + floors * FH;
  const stub = MeshBuilder.CreateCylinder(
    "lod-col",
    { height: columnTop + 0.4, diameter: 0.55, tessellation: 8 },
    scene,
  );
  stub.parent = parent;
  stub.position.y = columnTop / 2;
  stub.material = m.column;
  stub.isPickable = false;
  mountPitchedSolarOnColumn(scene, bab, parent, m, columnTop);
}

function buildRiseStage(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  floors: number,
): void {
  const columnTop = EXCAVATE_COLUMN_TOP + floors * FH;
  const shaftR = OUTER_R;
  const floorY = -EXCAVATE_DEPTH;
  const pitOpen = floors === 1; // hole still visible; later stages backfilled

  // Base without default beam — we place bridge to the wall door on the high (+Z) side
  buildVerticalContainer(scene, bab, parent, m, floorY, "pit-container");
  const containerTop = floorY + POD.length;
  buildColumnWithConsole(scene, bab, parent, m, containerTop, columnTop);
  // Berm only on open-pit excavate; rise stages must not wear a dirt ring.
  mountPitchedSolarOnColumn(scene, bab, parent, m, columnTop);

  // Bridge to outside of hole, high side of pitched roof (+Z).
  // Main entrance double-door lives in floor-0 living facade (no separate bridge frame).
  buildBeamToColumn(scene, bab, parent, m, shaftR, INNER_R - 0.05);

  // 15 m floor slabs protrude past the 12 m wall (1.5 m balcony all around).
  const slabH = SLAB_H;

  const roomH = Math.min(FH - 0.4, 3.1);
  const facadeRel = roomH * 0.92; // matches buildFloorInterior facadeTop

  if (pitOpen) {
    // Below-grade pit tube only — grade+ openings live in the punched facade shell
    const wallBottom = floorY;
    buildSolidWallBand(
      scene,
      bab,
      parent,
      m,
      "rise-wall-pit",
      INNER_R,
      wallBottom,
      Math.max(0.1, 0 - wallBottom),
    );

    buildFloorSlab(scene, bab, parent, m, "rise-slab-0", 0, slabH, 0);

    const interiorY = slabH;
    buildFloorMeterGrid(scene, bab, parent, "rise-grid-0", interiorY, FACADE_R);
    const facadeBandTop = interiorY + facadeRel;
    buildFloorInterior(scene, bab, parent, m, 0, interiorY, {
      ceilingAt: (x, z) => pitchedRoofUndersideY(x, z, columnTop) - ROOF_CLEAR,
    });
    // Above facade → pitched ribbon (skips arcs where roof already ≤ facade)
    buildPitchedWallInfill(
      scene,
      bab,
      parent,
      m,
      INNER_R,
      facadeBandTop,
      columnTop,
      "roof-infill-0",
    );
  } else {
    // Backfilled: punched facade only (no mid cylinders); spandrel to next slab;
    // top floor ribbon to pitched roof.
    const topI = floors - 1;
    for (let i = 0; i < floors; i++) {
      const y0 = i * FH;
      const isTop = i === topI;
      const interiorY = y0 + slabH;
      const facadeBandTop = interiorY + facadeRel;
      // Next slab underside (or this floor's nominal ceiling plane)
      const nextSlabUnder = y0 + FH;

      // No separate grade cylinder — punched facade shell owns the outer wall

      buildFloorSlab(scene, bab, parent, m, `rise-slab-${i}`, y0, slabH, i);
      buildFloorMeterGrid(scene, bab, parent, `rise-grid-${i}`, interiorY, FACADE_R);

      if (isTop) {
        buildFloorInterior(scene, bab, parent, m, i, interiorY, {
          ceilingAt: (x, z) => pitchedRoofUndersideY(x, z, columnTop) - ROOF_CLEAR,
        });
        buildPitchedWallInfill(
          scene,
          bab,
          parent,
          m,
          INNER_R,
          facadeBandTop,
          columnTop,
          `roof-infill-${i}`,
        );
      } else {
        buildFloorInterior(scene, bab, parent, m, i, interiorY, {
          shellTopY: nextSlabUnder,
        });
      }
    }
  }

  // Exterior wrap stairs: continuous slab is the landing; flights skip door clear
  for (let i = 0; i < floors; i++) {
    const slabTop = i * FH + slabH;
    if (i < floors - 1) {
      buildFlight(scene, bab, parent, m, i, slabTop);
    }
  }
}

/**
 * Solar-pitched stage (no hole yet): column + console from a short stub, disc above ground.
 */
/** Pitched disc on a short column. Slot 2 is the pit now; kept for that study. */
export function buildPitchedSolarStage(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
): void {
  const stubTop = -0.4;
  const columnTop = EXCAVATE_COLUMN_TOP;
  buildColumnWithConsole(scene, bab, parent, m, stubTop, columnTop);
  mountPitchedSolarOnColumn(scene, bab, parent, m, columnTop);
}

/**
 * Stages with an open excavated shaft (terrain carve in walk).
 * After underground walls exist (rise-1), later stages are backfilled — no carve.
 */
export function stagesWithPit(): StageId[] {
  return ["excavate", "rise-1", "gantry"];
}


const WALK_STEP = 1.35;

function stageFloors(id: StageId): number {
  if (id === "rise-1") return 1;
  if (id === "rise-3") return 3;
  if (id === "tower-full") return TOWER_SPEC.floorsFull;
  return 0;
}

/** Walk scene content: construction stages strip vs finished habitat tower. */
export type WalkLayout = "stages" | "habitat";

/** Focus + 6 neighbors with ENU centers and per-hex Agrokruh yaw. */
export function habitatSites(focusCell: string): {
  cell: string;
  x: number;
  z: number;
  yaw: number;
}[] {
  return habitatClusterCells(focusCell).map((id) => {
    const c =
      id === focusCell ? { x: 0, z: 0 } : cellCenterEnu(id, focusCell);
    return { cell: id, x: c.x, z: c.z, yaw: h3AgroYaw(id) };
  });
}

/**
 * Walkable deck height at a world XZ (bridges + 15 m floor slabs), combined with terrain.
 * `footY` is current sole height — picks the highest surface you can step onto.
 * `layout: "habitat"` = full towers on focus + 6 neighbor hexes.
 */
export function walkSurfaceY(
  worldX: number,
  worldZ: number,
  terrainY: number,
  groundAt: (x: number, z: number) => number,
  footY: number,
  layout: WalkLayout = "stages",
  agroYaw = 0,
  focusCell: string | null = null,
): number {
  const decks: number[] = [];

  type Site = { x: number; z: number; floors: number; isExcavate: boolean };
  const sites: Site[] =
    layout === "habitat"
      ? (focusCell ? habitatSites(focusCell) : [{ x: 0, z: 0, yaw: agroYaw, cell: "" }]).map(
          (h) => ({
            x: h.x,
            z: h.z,
            floors: TOWER_SPEC.floorsFull,
            isExcavate: false,
          }),
        )
      : STAGES.map((stage) => ({
          x: stage.x,
          z: stage.z,
          floors: stageFloors(stage.id),
          isExcavate: stage.id === "excavate",
        }));

  for (const stage of sites) {
    const floors = stage.floors;
    const isExcavate = stage.isExcavate;
    if (!isExcavate && floors < 1) continue;

    const lx = worldX - stage.x;
    const lz = worldZ - stage.z;
    const gy = groundAt(stage.x, stage.z);

    const innerZ = isExcavate ? POD.tubeDiameter * 0.6 : INNER_R - 0.05;
    const outerZ = OUTER_R + BRIDGE_OUTER_EXTRA;
    if (
      Math.abs(lx) <= BRIDGE_HALF_WIDTH + 0.05 &&
      lz >= innerZ - 0.2 &&
      lz <= outerZ + 0.15
    ) {
      decks.push(gy + BRIDGE_DECK_TOP);
    }

    // Door sill / threshold through floor-0 +Z wall (yaw 0) — grades bridge to landing
    if (
      floors >= 1 &&
      Math.abs(lx) <= DOOR_WIDTH_DOUBLE / 2 + 0.1 &&
      Math.abs(lz - INNER_R) <= 0.45
    ) {
      decks.push(gy + BRIDGE_DECK_TOP);
    }

    if (floors >= 1) {
      const r = Math.hypot(lx, lz);
      const doorClearHalf = gateHalfAng();
      const stairCutHalf = STAIR_CUT_HALF;
      const ang = Math.atan2(lz, lx);
      if (r <= FACADE_R + 0.08) {
        for (let i = 0; i < floors; i++) {
          // Interior disk top = y0 + SLAB_H
          decks.push(gy + i * FH + SLAB_H);
        }
      } else if (r <= OUTER_R + 0.08) {
        for (let i = 0; i < floors; i++) {
          const mainAng = Math.PI / 2 + floorYaw(i);
          // Balcony ring — skip stair-width CSG cut (left of door); door-front is slab
          const cutMid = mainAng - doorClearHalf - stairCutHalf;
          const inCutAng =
            Math.abs(angNormDiff(ang, cutMid)) <= stairCutHalf + 0.02;
          const inCutRad =
            r >= STAIR_R - TREAD_RADIAL / 2 - 0.08 &&
            r <= STAIR_R + TREAD_RADIAL / 2 + 0.08;
          if (inCutAng && inCutRad) continue;
          // Skip departure-floor slab on flight tread band (treads own the ring)
          if (
            i < floors - 1 &&
            Math.abs(r - STAIR_R) <= TREAD_RADIAL / 2 + 0.08
          ) {
            const fa = flightAngles(i);
            if (angOnFlightSpan(ang, fa.startAng, fa.endAng)) continue;
          }
          decks.push(gy + i * FH + SLAB_H);
        }
      }

      // Helical stair treads — hit test matches mesh footprint (run box / half-angle)
      if (Math.abs(r - STAIR_R) <= TREAD_RADIAL / 2 + 0.06) {
        for (let i = 0; i < floors - 1; i++) {
          const { mainAng, clear, startAng, nRisers, dAng, slabTop } =
            flightAngles(i);
          const run = Math.max(0.28, 2 * STAIR_R * Math.sin(Math.abs(dAng) / 2) * 1.2);
          const halfAng = Math.atan2(run / 2, STAIR_R) + 0.02;
          for (let s = 0; s < nRisers; s++) {
            const mid = startAng + dAng * (s + 0.5);
            if (Math.abs(angNormDiff(mid, mainAng)) < clear - 0.001) continue;
            if (Math.abs(angNormDiff(ang, mid)) <= halfAng) {
              decks.push(gy + slabTop + RISER * (s + 1));
            }
          }
        }
      }
    }
  }

  if (layout === "habitat") {
    const hubs = focusCell
      ? habitatSites(focusCell)
      : [{ x: 0, z: 0, yaw: agroYaw, cell: "" }];
    for (const hub of hubs) {
      for (const bed of agrokruhBeds(hub.yaw)) {
        const bx = hub.x + bed.x;
        const bz = hub.z + bed.z;
        const dx = worldX - bx;
        const dz = worldZ - bz;
        if (dx * dx + dz * dz <= (bed.r + 0.05) * (bed.r + 0.05)) {
          decks.push(groundAt(bx, bz) + AGRO_BED_H);
        }
      }
    }
  }

  const options = [terrainY, ...decks];
  let best = terrainY;
  for (const s of options) {
    if (s > footY + WALK_STEP) continue;
    if (s > best) best = s;
  }
  return best;
}

export function buildConstructionStrip(
  scene: Scene,
  bab: Bab,
  groundAt: (x: number, z: number) => number,
  ground: Mesh | null = null,
): TransformNode {
  const { TransformNode, DynamicTexture } = bab;
  const strip = new TransformNode("construction-strip", scene);
  const m = mats(scene, bab);
  const babWithTex = { ...bab, DynamicTexture };

  for (let stageIndex = 0; stageIndex < STAGES.length; stageIndex++) {
    const stage = STAGES[stageIndex]!;
    const gy = groundAt(stage.x, stage.z);
    const root = new TransformNode(stage.id, scene);
    root.parent = strip;
    root.position.set(stage.x, gy + 0.04, stage.z);

    if (stage.id === "solar-flat") {
      buildSolarPanel(scene, bab, root, m, false, 0, undefined, true);
    } else if (stage.id === "excavate") {
      buildExcavateStage(scene, bab, root, m);
    } else if (stage.id === "rise-1") {
      buildRiseStage(scene, bab, root, m, 1);
    } else if (stage.id === "rise-3") {
      buildRiseStage(scene, bab, root, m, 3);
    } else if (stage.id === "tower-full") {
      buildRiseStage(scene, bab, root, m, TOWER_SPEC.floorsFull);
    } else if (stage.id === "gantry") {
      buildGantryStage(scene, bab, root, m, ground, stage.x, stage.z, gy);
    }

    addLabel(scene, babWithTex, root, stage.label, OUTER_R + 2);
  }

  return strip;
}

/**
 * Agrokruh around Habitat — farm R=60, pivots on a hex lattice (spacing 24 m), bed R=11.
 * Lattice yaw matches the H3 cell (beds toward vertices), snapped so a gap faces +Z entrance.
 * Circles: annuals / small perennials. Interspaces: food forest. Outer arc: light windbreak.
 * Cable/path radials: not meshed until Martin approves.
 */
const AGRO_FARM_R = 60;
const AGRO_BED_R = 11; // Ø22 m discs
const AGRO_PIVOT_SPACING = 24;
const AGRO_PATH_W = 2.5;
const AGRO_SPOKE_W = 3.0;
const AGRO_PATH_R1 = Math.max(
  OUTER_R + AGRO_PATH_W,
  AGRO_PIVOT_SPACING - AGRO_BED_R,
);
const AGRO_BED_H = 0.18;
const AGRO_CROP_H = 0.35;
const AGRO_ENTRANCE_ANG = Math.PI / 2;

export type AgroBed = { x: number; z: number; r: number };

function agroHexDist(q: number, r: number): number {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

/** Pointy-top axial → ENU before yaw; neighbor distance = AGRO_PIVOT_SPACING. */
function agroAxialLocal(q: number, r: number): { x: number; z: number } {
  const a = AGRO_PIVOT_SPACING;
  return {
    x: a * (q + r / 2),
    z: a * ((Math.sqrt(3) / 2) * r),
  };
}

/**
 * Yaw that aligns the Agrokruh hex lattice with the H3 cell outline.
 * Picks among the 6 vertex-aligned orientations the one whose gap is closest to +Z.
 */
export function h3AgroYaw(cell: string): number {
  const ring = hexRingEnu(cell);
  if (ring.length < 1) return 0;
  const p0 = ring[0]!;
  const base = Math.atan2(p0.z, p0.x);
  let best = base;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let m = 0; m < 6; m++) {
    const yaw = base + (m * Math.PI) / 3;
    for (let k = 0; k < 6; k++) {
      const gap = yaw + Math.PI / 6 + (k * Math.PI) / 3;
      const d = Math.abs(angNormDiff(gap, AGRO_ENTRANCE_ANG));
      if (d < bestScore) {
        bestScore = d;
        best = yaw;
      }
    }
  }
  return best;
}

/**
 * 18 Agrokruh pivots on a hex grid (6 + 12), rotated by `yaw` (from h3AgroYaw).
 */
export function agrokruhBeds(yaw = 0): AgroBed[] {
  const beds: AgroBed[] = [];
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const d = agroHexDist(q, r);
      if (d !== 1 && d !== 2) continue;
      const local = agroAxialLocal(q, r);
      beds.push({
        x: local.x * c - local.z * s,
        z: local.x * s + local.z * c,
        r: AGRO_BED_R,
      });
    }
  }
  return beds;
}


function agroHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function agroRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function agroDist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

/** Centroids of equilateral triangles (side ≈ pivot spacing) among pivots — tree pockets. */
function agroTreeSites(
  pivots: { x: number; z: number }[],
): { x: number; z: number }[] {
  const sites: { x: number; z: number }[] = [];
  const seen = new Set<string>();
  const n = pivots.length;
  const side = AGRO_PIVOT_SPACING;
  const tol = 0.85;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const a = pivots[i]!;
        const b = pivots[j]!;
        const c = pivots[k]!;
        const dAb = Math.hypot(a.x - b.x, a.z - b.z);
        const dAc = Math.hypot(a.x - c.x, a.z - c.z);
        const dBc = Math.hypot(b.x - c.x, b.z - c.z);
        if (
          Math.abs(dAb - side) > tol ||
          Math.abs(dAc - side) > tol ||
          Math.abs(dBc - side) > tol
        ) {
          continue;
        }
        const x = (a.x + b.x + c.x) / 3;
        const z = (a.z + b.z + c.z) / 3;
        const key = `${x.toFixed(2)},${z.toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sites.push({ x, z });
      }
    }
  }
  return sites;
}


/** Sample ground under a footprint; use max so large discs/trees are not buried in slopes. */
function groundClearanceAt(
  groundAt: (x: number, z: number) => number,
  x: number,
  z: number,
  radius = 0,
  lift = 0.06,
): number {
  let h = groundAt(x, z);
  if (radius > 0.05) {
    const rings = radius > 4 ? [0.35, 0.7, 1] : [0.6, 1];
    const n = radius > 4 ? 12 : 8;
    for (const f of rings) {
      const r = radius * f;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        h = Math.max(h, groundAt(x + Math.cos(a) * r, z + Math.sin(a) * r));
      }
    }
  }
  return h + lift;
}

function buildAgrokruh(
  scene: Scene,
  bab: Bab,
  parent: TransformNode,
  m: ReturnType<typeof mats>,
  groundAt: (x: number, z: number) => number,
  yaw: number,
  cell: string,
  detail: "full" | "lod" = "full",
): void {
  const { MeshBuilder, TransformNode } = bab;
  const farm = new TransformNode("agrokruh", scene);
  farm.parent = parent;
  const originGy = groundAt(0, 0);
  const rand = agroRng(agroHash(cell) ^ 0xa9e0);

  const beds = agrokruhBeds(yaw);
  let bedExtent = 0;
  for (const bed of beds) {
    bedExtent = Math.max(bedExtent, Math.hypot(bed.x, bed.z) + bed.r);
  }

  // Gap angles: beds toward H3 vertices → gaps at yaw+30°+k·60° (circulation + cable).
  const gapAngs: number[] = [];
  for (let k = 0; k < 6; k++) {
    gapAngs.push(yaw + Math.PI / 6 + (k * Math.PI) / 3);
  }

  const nearGapRadial = (
    x: number,
    z: number,
    halfW: number,
    rMin: number,
  ): boolean => {
    const r = Math.hypot(x, z);
    if (r < rMin) return false;
    const ang = Math.atan2(z, x);
    for (const g of gapAngs) {
      if (Math.abs(angNormDiff(ang, g)) <= Math.atan2(halfW, Math.max(r, 1))) {
        return true;
      }
    }
    return false;
  };

  // No radial path/cable meshes until Martin approves a design (Bucky may suggest).

  const bedNodes: TransformNode[] = [];
  for (const [i, bed] of beds.entries()) {
    const node = new TransformNode(`agro-bed-${i}`, scene);
    node.parent = farm;
    node.position.set(
      bed.x,
      groundClearanceAt(groundAt, bed.x, bed.z, bed.r) - originGy,
      bed.z,
    );
    bedNodes.push(node);

    const soil = MeshBuilder.CreateCylinder(
      `agro-soil-${i}`,
      {
        height: AGRO_BED_H,
        diameter: bed.r * 2,
        tessellation: detail === "lod" ? 12 : 24,
      },
      scene,
    );
    soil.parent = node;
    soil.position.y = AGRO_BED_H / 2;
    soil.material = m.soil;
    soil.isPickable = false;
    soil.doNotSyncBoundingInfo = true;

    // Annuals / small perennials in-circle (placeholder crop pad).
    const crop = MeshBuilder.CreateCylinder(
      `agro-crop-${i}`,
      {
        height: AGRO_CROP_H,
        diameter: bed.r * 2 - 0.8,
        tessellation: detail === "lod" ? 10 : 16,
      },
      scene,
    );
    crop.parent = node;
    crop.position.y = AGRO_BED_H + AGRO_CROP_H / 2;
    crop.material = m.crop;
    crop.isPickable = false;

    const pivot = MeshBuilder.CreateCylinder(
      `agro-pivot-${i}`,
      { height: 1.1, diameter: 0.22, tessellation: 10 },
      scene,
    );
    pivot.parent = node;
    pivot.position.y = 0.55;
    pivot.material = m.rail;
    pivot.isPickable = false;
  }

  // 6 Agrokruh arms on random circles (seeded per cell).
  const armIdx = beds.map((_, i) => i);
  for (let i = armIdx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = armIdx[i]!;
    armIdx[i] = armIdx[j]!;
    armIdx[j] = tmp;
  }
  const ARM_N = Math.min(6, armIdx.length);
  for (let a = 0; a < ARM_N; a++) {
    const bi = armIdx[a]!;
    const bed = beds[bi]!;
    const bedNode = bedNodes[bi]!;
    const yaw0 = rand() * Math.PI * 2;
    const wheelR = 0.55;
    // Wheel center on the bed perimeter; boom reaches the axle.
    const armLen = bed.r;
    const boomH = 1.5; // working height of the Agrokruh frame

    const boomRoot = new TransformNode(`agro-arm-${bi}`, scene);
    boomRoot.parent = bedNode;
    boomRoot.rotation.y = yaw0;

    // Vertical mast to working height.
    const mast = MeshBuilder.CreateCylinder(
      `agro-arm-mast-${bi}`,
      { height: boomH, diameter: 0.28, tessellation: 10 },
      scene,
    );
    mast.parent = boomRoot;
    mast.position.y = boomH / 2;
    mast.material = m.rail;
    mast.isPickable = false;
    mast.doNotSyncBoundingInfo = true;

    // Radial boom from hub toward rim (depth along local +Z).
    const boom = MeshBuilder.CreateBox(
      `agro-arm-boom-${bi}`,
      { width: 0.32, height: 0.22, depth: Math.max(0.5, armLen - wheelR * 0.3) },
      scene,
    );
    boom.parent = boomRoot;
    boom.position.set(0, boomH, Math.max(0.5, armLen - wheelR * 0.3) / 2);
    boom.material = m.rail;
    boom.isPickable = false;
    boom.doNotSyncBoundingInfo = true;

    // Carriage / tool head just inside the wheel.
    const head = MeshBuilder.CreateBox(
      `agro-arm-head-${bi}`,
      { width: 0.55, height: 0.4, depth: 0.65 },
      scene,
    );
    head.parent = boomRoot;
    head.position.set(0, boomH - 0.02, armLen - wheelR - 0.45);
    head.material = m.column;
    head.isPickable = false;
    head.doNotSyncBoundingInfo = true;

    // Drive wheel on the perimeter: axle radial (local Z), disk vertical in the
    // tangent plane so it rolls along the circle as the arm spins.
    const wheel = MeshBuilder.CreateCylinder(
      `agro-arm-wheel-${bi}`,
      { height: 0.16, diameter: wheelR * 2, tessellation: 18 },
      scene,
    );
    wheel.parent = boomRoot;
    wheel.rotation.x = Math.PI / 2; // cylinder axis → local Z (radial axle)
    wheel.position.set(0, wheelR, armLen);
    wheel.material = m.rail;
    wheel.isPickable = false;
    wheel.doNotSyncBoundingInfo = true;

    // Drop from boom tip down to the perimeter wheel.
    const drop = MeshBuilder.CreateCylinder(
      `agro-arm-drop-${bi}`,
      { height: Math.max(0.2, boomH - wheelR), diameter: 0.14, tessellation: 8 },
      scene,
    );
    drop.parent = boomRoot;
    drop.position.set(0, (boomH + wheelR) / 2, armLen);
    drop.material = m.rail;
    drop.isPickable = false;
    drop.doNotSyncBoundingInfo = true;

    // Slow spin so arms read as working units (full detail only).
    if (detail === "full") {
      const spin = (0.08 + rand() * 0.12) * (rand() < 0.5 ? 1 : -1);
      const observer = scene.onBeforeRenderObservable.add(() => {
        if (boomRoot.isDisposed()) {
          scene.onBeforeRenderObservable.remove(observer);
          return;
        }
        const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
        boomRoot.rotation.y += spin * dt;
      });
    }
  }

  // Food-forest pockets at triangle centroids. Clear path/stair + cable radials.
  if (detail === "lod") return;

  const pivots = [{ x: 0, z: 0 }, ...beds.map((b) => ({ x: b.x, z: b.z }))];
  const treeSites = agroTreeSites(pivots).filter((p) => {
    const r = Math.hypot(p.x, p.z);
    if (r < AGRO_PATH_R1 + 3.5 || r > AGRO_FARM_R - 3) return false;
    if (nearGapRadial(p.x, p.z, AGRO_SPOKE_W * 0.55, AGRO_PATH_R1)) return false;
    return true;
  });

  const plants = new TransformNode("agro-plants", scene);
  plants.parent = farm;

  const placeTree = (tx: number, tz: number, i: number): void => {
    const gy = groundClearanceAt(groundAt, tx, tz, 0.45) - originGy;
    const scale = 0.75 + rand() * 0.45;
    const trunkH = 1.6 * scale;
    const canopyR = 1.25 * scale;
    const node = new TransformNode(`agro-tree-${i}`, scene);
    node.parent = plants;
    node.position.set(tx, gy, tz);

    const trunk = MeshBuilder.CreateCylinder(
      `agro-trunk-${i}`,
      { height: trunkH, diameter: 0.22 * scale, tessellation: 8 },
      scene,
    );
    trunk.parent = node;
    trunk.position.y = trunkH / 2;
    trunk.material = m.trunk;
    trunk.isPickable = false;

    const canopy = MeshBuilder.CreateSphere(
      `agro-canopy-${i}`,
      { diameter: canopyR * 2, segments: 8 },
      scene,
    );
    canopy.parent = node;
    canopy.position.y = trunkH + canopyR * 0.55;
    canopy.scaling.y = 0.85;
    canopy.material = m.canopy;
    canopy.isPickable = false;
  };

  let treeIdx = 0;
  for (const site of treeSites) {
    // ×3 per triangular pocket (Martin density).
    const count = 3;
    for (let k = 0; k < count; k++) {
      const jitterR = k === 0 ? 0 : 0.6 + rand() * 0.9;
      const jitterA = rand() * Math.PI * 2;
      const tx = site.x + Math.cos(jitterA) * jitterR;
      const tz = site.z + Math.sin(jitterA) * jitterR;
      if (Math.hypot(tx, tz) < AGRO_PATH_R1 + 3.5) continue;
      if (nearGapRadial(tx, tz, AGRO_SPOKE_W * 0.55, AGRO_PATH_R1)) continue;
      let blocked = false;
      for (const bed of beds) {
        if (agroDist2(tx, tz, bed.x, bed.z) < (bed.r + 0.9) * (bed.r + 0.9)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      placeTree(tx, tz, treeIdx++);
    }
  }

  // Biodiversity shrubs in leftover gaps (×≈5 ≈450). Clear beds / path / gap radials.
  const shrubClear = 0.55;
  const shrubMinSep = 1.35;
  const shrubPts: { x: number; z: number }[] = [];
  const attempts = 2800;
  for (let n = 0; n < attempts && shrubPts.length < 450; n++) {
    const ang = rand() * Math.PI * 2;
    const rad =
      AGRO_PATH_R1 +
      1.5 +
      rand() * Math.max(1, AGRO_FARM_R - AGRO_PATH_R1 - 5);
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (Math.hypot(x, z) > AGRO_FARM_R - 2.5) continue;
    if (nearGapRadial(x, z, AGRO_SPOKE_W * 0.55, AGRO_PATH_R1)) continue;

    let ok = true;
    for (const bed of beds) {
      if (
        agroDist2(x, z, bed.x, bed.z) <
        (bed.r + shrubClear) * (bed.r + shrubClear)
      ) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const tr of treeSites) {
      if (agroDist2(x, z, tr.x, tr.z) < 2.4 * 2.4) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const s of shrubPts) {
      if (agroDist2(x, z, s.x, s.z) < shrubMinSep * shrubMinSep) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    shrubPts.push({ x, z });
  }

  // Light outer windbreak just inside R=60, gaps on cable radials.
  const windR = AGRO_FARM_R - 2.2;
  for (let i = 0; i < 48; i++) {
    const ang = (i / 48) * Math.PI * 2 + rand() * 0.04;
    const x = Math.cos(ang) * windR;
    const z = Math.sin(ang) * windR;
    if (nearGapRadial(x, z, AGRO_SPOKE_W * 0.7, windR - 1)) continue;
    shrubPts.push({ x, z });
  }

  for (const [i, s] of shrubPts.entries()) {
    const gy = groundClearanceAt(groundAt, s.x, s.z, 0.35) - originGy;
    const scale = 0.55 + rand() * 0.7;
    const node = new TransformNode(`agro-shrub-${i}`, scene);
    node.parent = plants;
    node.position.set(s.x, gy, s.z);
    node.rotation.y = rand() * Math.PI * 2;

    const bush = MeshBuilder.CreateSphere(
      `agro-bush-${i}`,
      { diameter: 1.1 * scale, segments: 6 },
      scene,
    );
    bush.parent = node;
    bush.position.y = 0.35 * scale;
    bush.scaling.set(1.15, 0.7, 1.05);
    bush.material = m.shrub;
    bush.isPickable = false;

    if (rand() > 0.45) {
      const bush2 = MeshBuilder.CreateSphere(
        `agro-bush2-${i}`,
        { diameter: 0.75 * scale, segments: 6 },
        scene,
      );
      bush2.parent = node;
      bush2.position.set(
        (rand() - 0.5) * 0.45 * scale,
        0.28 * scale,
        (rand() - 0.5) * 0.45 * scale,
      );
      bush2.scaling.set(1.1, 0.65, 1.0);
      bush2.material = m.shrub;
      bush2.isPickable = false;
    }
  }
}

/** Finished habitat: full tower + Agrokruh on focus hex and each of 6 neighbors. */
export function buildHabitatStrip(
  scene: Scene,
  bab: Bab,
  groundAt: (x: number, z: number) => number,
  cell: string,
): TransformNode {
  const { TransformNode } = bab;
  const strip = new TransformNode("habitat-strip", scene);
  const m = mats(scene, bab);

  for (const hub of habitatSites(cell)) {
    const root = new TransformNode(`habitat-${hub.cell}`, scene);
    root.parent = strip;
    const gy = groundAt(hub.x, hub.z);
    root.position.set(hub.x, gy + 0.04, hub.z);
    const localGround = (lx: number, lz: number): number =>
      groundAt(hub.x + lx, hub.z + lz);
    const isFocus = hub.cell === cell;
    if (isFocus) {
      buildRiseStage(scene, bab, root, m, TOWER_SPEC.floorsFull);
      buildAgrokruh(scene, bab, root, m, localGround, hub.yaw, hub.cell, "full");
      spawnHabitatCrowd(scene, bab, root, localGround, hub.yaw);
    } else {
      buildRiseStageLod(scene, bab, root, m, TOWER_SPEC.floorsFull);
      buildAgrokruh(scene, bab, root, m, localGround, hub.yaw, hub.cell, "lod");
    }
    // Babylon mesh names must not collide across the 7 hex copies.
    const prefix = `${hub.cell}-`;
    for (const mesh of root.getChildMeshes(/* direct */ false)) {
      if (!mesh.name.startsWith(prefix)) mesh.name = prefix + mesh.name;
    }
    const kids = root.getChildTransformNodes
      ? root.getChildTransformNodes(false)
      : [];
    for (const node of kids) {
      if (node.name && !node.name.startsWith(prefix)) {
        node.name = prefix + node.name;
      }
    }
  }
  return strip;
}


/** Footprints for Look / MapLibre extrusion (lng/lat computed by caller). */
export function stageFootprints(): {
  id: StageId | "live-pod";
  x: number;
  z: number;
  radius: number;
  height: number;
  color: string;
}[] {
  const live = {
    id: "live-pod" as const,
    x: 0,
    z: 0,
    radius: Math.hypot(POD.width / 2, POD.length / 2),
    height: livePodExtrude(),
    color: "#6b4a32",
  };
  const demo = STAGES.map((s) => {
    const full = s.id === "tower-full";
    const floors =
      s.id === "rise-1"
        ? 1
        : s.id === "rise-3"
          ? 3
          : s.id === "gantry"
            ? GANTRY_FLOORS
            : full
              ? TOWER_SPEC.floorsFull
              : 0;
    const height =
      floors > 0
        ? floors * FH + 2
        : s.id.startsWith("solar")
          ? 1.5
          : s.id === "excavate"
            ? EXCAVATE_DEPTH
            : 2;
    return {
      id: s.id,
      x: s.x,
      z: s.z,
      radius: s.id.startsWith("solar") ? 6.5 : OUTER_R,
      height,
      color: floors > 0 ? "#c8c8c4" : s.id === "excavate" ? "#5a4a32" : "#1a2840",
    };
  });
  return [live, ...demo];
}

function livePodExtrude(): number {
  return POD.tubeHeightAboveGrade + 0.5;
}

export function towerHeight(): number {
  return TOWER_SPEC.floorsFull * FH + 2;
}

if (import.meta.hot) {
  // Placements change should re-evaluate this module so Walk gets fresh TOWER_SPEC/POD.
  import.meta.hot.accept("./placements", () => {
    import.meta.hot?.invalidate();
  });
  import.meta.hot.accept("./crowd", () => {
    import.meta.hot?.invalidate();
  });
}

