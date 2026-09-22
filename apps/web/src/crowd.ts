/**
 * Habitat crowd: articulated skeleton figures on fixed patrol paths
 * (stairs, rooms, farm). Focus hex only.
 */
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode as BTransformNode } from "@babylonjs/core/Meshes/transformNode";

type Bab = {
  MeshBuilder: typeof import("@babylonjs/core/Meshes/meshBuilder").MeshBuilder;
  StandardMaterial: typeof import("@babylonjs/core/Materials/standardMaterial").StandardMaterial;
  Color3: typeof import("@babylonjs/core/Maths/math.color").Color3;
  TransformNode: typeof import("@babylonjs/core/Meshes/transformNode").TransformNode;
  Vector3?: typeof import("@babylonjs/core/Maths/math.vector").Vector3;
};

type Pt = { x: number; y: number; z: number };

const OUTER_R = 7.5;
const FH = 3.5;
const SLAB_H = 0.22;
const RISER = FH / 24;
const STAIR_R = OUTER_R - 0.55;
const STAIR_HAND = 1;
const ENTRANCE_ROT = Math.PI / 4;
const LANDING_CLEAR_W = 2.2;
const RAIL_R_OUT = OUTER_R;

function gateHalfAng(): number {
  return Math.atan2(LANDING_CLEAR_W / 2, RAIL_R_OUT);
}

function floorYaw(i: number): number {
  return STAIR_HAND * i * ENTRANCE_ROT;
}

function flightAngles(floorIndex: number) {
  const mainAng = Math.PI / 2 + floorYaw(floorIndex);
  const clear = gateHalfAng();
  const startAng = mainAng + STAIR_HAND * clear;
  const endAng = mainAng + STAIR_HAND * ENTRANCE_ROT - STAIR_HAND * clear;
  const nRisers = Math.round(FH / RISER);
  const dAng = (endAng - startAng) / nRisers;
  const slabTop = floorIndex * FH + SLAB_H;
  return { startAng, endAng, nRisers, dAng, slabTop };
}

function stairPath(fromFloor: number): Pt[] {
  const f = flightAngles(fromFloor);
  const pts: Pt[] = [];
  pts.push({
    x: STAIR_R * Math.cos(f.startAng),
    y: f.slabTop,
    z: STAIR_R * Math.sin(f.startAng),
  });
  for (let s = 0; s < f.nRisers; s++) {
    const ang = f.startAng + (s + 0.5) * f.dAng;
    pts.push({
      x: STAIR_R * Math.cos(ang),
      y: f.slabTop + RISER * (s + 1),
      z: STAIR_R * Math.sin(ang),
    });
  }
  pts.push({
    x: STAIR_R * Math.cos(f.endAng),
    y: f.slabTop + FH,
    z: STAIR_R * Math.sin(f.endAng),
  });
  return pts;
}

function ringPts(r: number, y: number, n: number, yaw0 = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = yaw0 + (i / n) * Math.PI * 2;
    pts.push({ x: r * Math.cos(a), y, z: r * Math.sin(a) });
  }
  return pts;
}

function roomLoop(floor: number, roomAng: number, depthR = 5.2): Pt[] {
  const y = floor * FH + SLAB_H;
  const a0 = roomAng - 0.35;
  const a1 = roomAng + 0.35;
  const rIn = 3.2;
  const rOut = depthR;
  return [
    { x: rIn * Math.cos(a0), y, z: rIn * Math.sin(a0) },
    { x: rOut * Math.cos(a0), y, z: rOut * Math.sin(a0) },
    { x: rOut * Math.cos(roomAng), y, z: rOut * Math.sin(roomAng) },
    { x: rOut * Math.cos(a1), y, z: rOut * Math.sin(a1) },
    { x: rIn * Math.cos(a1), y, z: rIn * Math.sin(a1) },
    { x: rIn * Math.cos(roomAng), y, z: rIn * Math.sin(roomAng) },
  ];
}

function corridorLoop(floor: number): Pt[] {
  const y = floor * FH + SLAB_H;
  return ringPts(2.55, y, 12, Math.PI / 2);
}

function farmBedLoop(
  bedCx: number,
  bedCz: number,
  bedR: number,
  gy: number,
  n = 10,
): Pt[] {
  const pts: Pt[] = [];
  const r = bedR + 1.4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: bedCx + r * Math.cos(a), y: gy, z: bedCz + r * Math.sin(a) });
  }
  return pts;
}

/** 20 fixed patrol paths in local tower frame (y = slab / ground). */
export function buildPatrolPaths(
  groundAt: (x: number, z: number) => number,
  agroYaw: number,
): Pt[][] {
  const g0 = groundAt(0, 0);
  const paths: Pt[][] = [];

  // 0–2: ground rings around tower
  paths.push(ringPts(OUTER_R + 2.2, g0, 16, 0).map((p) => ({ ...p, y: groundAt(p.x, p.z) })));
  paths.push(ringPts(OUTER_R + 4.5, g0, 14, 0.2).map((p) => ({ ...p, y: groundAt(p.x, p.z) })));
  paths.push(ringPts(OUTER_R + 7.0, g0, 12, 0.4).map((p) => ({ ...p, y: groundAt(p.x, p.z) })));

  // 3–5: climb stairs floors 0→1, 1→2, 2→3 (up then down)
  for (let f = 0; f < 3; f++) {
    const up = stairPath(f);
    const down = [...up].reverse();
    paths.push([...up, ...down.slice(1)]);
  }

  // 6–8: corridor loops floors 0–2
  for (let f = 0; f < 3; f++) paths.push(corridorLoop(f));

  // 9–14: six room loops on floors 0–1
  const roomAngs = [
    Math.PI / 2,
    Math.PI / 2 + 0.9,
    Math.PI / 2 - 0.9,
    Math.PI / 2 + 1.8,
    Math.PI / 2 - 1.8,
    Math.PI + 0.3,
  ];
  roomAngs.forEach((a, i) => paths.push(roomLoop(i < 3 ? 0 : 1, a)));

  // 15–19: farm — five bed perimeter loops
  const AGRO_BED_R = 11;
  const AGRO_INNER_RING_R = 24;
  const AGRO_OUTER_RING_R = 48;
  const bedSites: { cx: number; cz: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = agroYaw + (i * Math.PI) / 3;
    bedSites.push({
      cx: AGRO_INNER_RING_R * Math.cos(a),
      cz: AGRO_INNER_RING_R * Math.sin(a),
    });
  }
  for (let i = 0; i < 6; i++) {
    const a = agroYaw + Math.PI / 6 + (i * Math.PI) / 3;
    bedSites.push({
      cx: AGRO_OUTER_RING_R * Math.cos(a),
      cz: AGRO_OUTER_RING_R * Math.sin(a),
    });
  }
  for (const idx of [0, 2, 4, 7, 10]) {
    const b = bedSites[idx]!;
    paths.push(
      farmBedLoop(b.cx, b.cz, AGRO_BED_R, g0).map((p) => ({
        ...p,
        y: groundAt(p.x, p.z) + 0.02,
      })),
    );
  }

  return paths.slice(0, 20);
}

type Limb = {
  thigh: BTransformNode;
  shin: BTransformNode;
  upper: BTransformNode;
  fore: BTransformNode;
};

type PersonRig = {
  root: BTransformNode;
  hips: BTransformNode;
  spine: BTransformNode;
  chest: BTransformNode;
  head: BTransformNode;
  L: Limb;
  R: Limb;
  height: number;
  phase: number;
  path: Pt[];
  seg: number;
  t: number;
  speed: number;
};

function bone(
  bab: Bab,
  scene: Scene,
  name: string,
  parent: BTransformNode,
  len: number,
  thick: number,
  mat: InstanceType<Bab["StandardMaterial"]>,
): BTransformNode {
  const { MeshBuilder, TransformNode } = bab;
  const n = new TransformNode(name, scene);
  n.parent = parent;
  const mesh = MeshBuilder.CreateCylinder(
    `${name}-m`,
    { height: len, diameter: thick, tessellation: 6 },
    scene,
  );
  mesh.material = mat;
  mesh.parent = n;
  mesh.position.y = -len * 0.5;
  return n;
}

function buildSkeletonPerson(
  scene: Scene,
  bab: Bab,
  parent: BTransformNode,
  name: string,
  height: number,
  color: { r: number; g: number; b: number },
): PersonRig {
  const { MeshBuilder, StandardMaterial, Color3, TransformNode } = bab;
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.diffuseColor = new Color3(color.r, color.g, color.b);
  mat.specularColor = new Color3(0.04, 0.04, 0.04);
  mat.emissiveColor = new Color3(color.r * 0.1, color.g * 0.1, color.b * 0.1);

  const s = height / 1.75;
  const root = new TransformNode(name, scene);
  root.parent = parent;

  const hips = new TransformNode(`${name}-hips`, scene);
  hips.parent = root;
  hips.position.y = 0.92 * s;

  const hipMesh = MeshBuilder.CreateSphere(`${name}-hipm`, { diameter: 0.28 * s, segments: 6 }, scene);
  hipMesh.material = mat;
  hipMesh.parent = hips;
  hipMesh.scaling.y = 0.65;

  const spine = new TransformNode(`${name}-spine`, scene);
  spine.parent = hips;
  const torsoLen = 0.38 * s;
  const torso = MeshBuilder.CreateCylinder(
    `${name}-torso`,
    { height: torsoLen, diameterTop: 0.26 * s, diameterBottom: 0.3 * s, tessellation: 8 },
    scene,
  );
  torso.material = mat;
  torso.parent = spine;
  torso.position.y = torsoLen * 0.5;

  const chest = new TransformNode(`${name}-chest`, scene);
  chest.parent = spine;
  chest.position.y = torsoLen;
  const chestM = MeshBuilder.CreateSphere(`${name}-chestm`, { diameter: 0.32 * s, segments: 6 }, scene);
  chestM.material = mat;
  chestM.parent = chest;
  chestM.scaling.set(1.15, 0.55, 0.7);

  const head = new TransformNode(`${name}-head`, scene);
  head.parent = chest;
  head.position.y = 0.22 * s;
  const headM = MeshBuilder.CreateSphere(`${name}-headm`, { diameter: 0.22 * s, segments: 8 }, scene);
  headM.material = mat;
  headM.parent = head;
  headM.position.y = 0.12 * s;

  const makeArm = (side: "L" | "R"): Pick<Limb, "upper" | "fore"> => {
    const sign = side === "L" ? -1 : 1;
    const upper = bone(bab, scene, `${name}-${side}-ua`, chest, 0.28 * s, 0.07 * s, mat);
    upper.position.set(sign * 0.18 * s, 0.02 * s, 0);
    upper.rotation.z = sign * 0.15;
    const fore = bone(bab, scene, `${name}-${side}-fa`, upper, 0.26 * s, 0.06 * s, mat);
    fore.position.y = -0.28 * s;
    return { upper, fore };
  };

  const makeLeg = (side: "L" | "R"): Pick<Limb, "thigh" | "shin"> => {
    const sign = side === "L" ? -1 : 1;
    const thigh = bone(bab, scene, `${name}-${side}-th`, hips, 0.42 * s, 0.1 * s, mat);
    thigh.position.set(sign * 0.09 * s, 0, 0);
    const shin = bone(bab, scene, `${name}-${side}-sh`, thigh, 0.4 * s, 0.08 * s, mat);
    shin.position.y = -0.42 * s;
    const foot = MeshBuilder.CreateBox(
      `${name}-${side}-ft`,
      { width: 0.08 * s, height: 0.05 * s, depth: 0.18 * s },
      scene,
    );
    foot.material = mat;
    foot.parent = shin;
    foot.position.set(0, -0.4 * s, 0.04 * s);
    return { thigh, shin };
  };

  const La = makeArm("L");
  const Ra = makeArm("R");
  const Ll = makeLeg("L");
  const Rl = makeLeg("R");

  return {
    root,
    hips,
    spine,
    chest,
    head,
    L: { ...Ll, ...La },
    R: { ...Rl, ...Ra },
    height,
    phase: Math.random() * Math.PI * 2,
    path: [],
    seg: 0,
    t: 0,
    speed: 1.1 + Math.random() * 0.5,
  };
}

function applyWalkCycle(p: PersonRig, dt: number, moving: boolean): void {
  if (!moving) {
    p.L.thigh.rotation.x *= 0.85;
    p.R.thigh.rotation.x *= 0.85;
    p.L.shin.rotation.x *= 0.85;
    p.R.shin.rotation.x *= 0.85;
    p.L.upper.rotation.x *= 0.85;
    p.R.upper.rotation.x *= 0.85;
    return;
  }
  p.phase += dt * p.speed * 5.2;
  const sw = Math.sin(p.phase);
  const sw2 = Math.sin(p.phase + Math.PI);
  p.L.thigh.rotation.x = sw * 0.55;
  p.R.thigh.rotation.x = sw2 * 0.55;
  p.L.shin.rotation.x = Math.max(0, -sw) * 0.7;
  p.R.shin.rotation.x = Math.max(0, -sw2) * 0.7;
  p.L.upper.rotation.x = sw2 * 0.4;
  p.R.upper.rotation.x = sw * 0.4;
  p.L.fore.rotation.x = 0.25;
  p.R.fore.rotation.x = 0.25;
  p.hips.position.y = (0.92 * p.height) / 1.75 + Math.abs(sw) * 0.03;
  p.spine.rotation.y = sw * 0.06;
}

function advancePerson(p: PersonRig, dt: number): void {
  const path = p.path;
  if (path.length < 2) return;
  let remaining = p.speed * dt;
  let moving = false;
  while (remaining > 1e-5) {
    const i0 = p.seg;
    const i1 = (i0 + 1) % path.length;
    const a = path[i0]!;
    const b = path[i1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz) || 1e-6;
    const distLeft = (1 - p.t) * len;
    if (remaining < distLeft) {
      p.t += remaining / len;
      remaining = 0;
      moving = true;
    } else {
      remaining -= distLeft;
      p.seg = i1;
      p.t = 0;
      moving = true;
    }
  }
  const a = path[p.seg]!;
  const b = path[(p.seg + 1) % path.length]!;
  const x = a.x + (b.x - a.x) * p.t;
  const y = a.y + (b.y - a.y) * p.t;
  const z = a.z + (b.z - a.z) * p.t;
  p.root.position.set(x, y, z);
  const faceX = b.x - a.x;
  const faceZ = b.z - a.z;
  if (faceX * faceX + faceZ * faceZ > 1e-6) {
    p.root.rotation.y = Math.atan2(faceX, faceZ);
  }
  applyWalkCycle(p, dt, moving);
}

const PALETTE = [
  { r: 0.42, g: 0.38, b: 0.34 },
  { r: 0.35, g: 0.4, b: 0.45 },
  { r: 0.5, g: 0.42, b: 0.36 },
  { r: 0.38, g: 0.36, b: 0.42 },
  { r: 0.45, g: 0.4, b: 0.32 },
  { r: 0.32, g: 0.38, b: 0.4 },
];

/**
 * Spawn ~20 skeletal people on fixed habitat patrol paths.
 * Returns a disposer (also auto-stops when `parent` is disposed).
 */
export function spawnHabitatCrowd(
  scene: Scene,
  bab: Bab,
  parent: BTransformNode,
  groundAt: (x: number, z: number) => number,
  agroYaw: number,
): () => void {
  const paths = buildPatrolPaths(groundAt, agroYaw);
  const people: PersonRig[] = [];
  const n = Math.min(20, paths.length);
  for (let i = 0; i < n; i++) {
    const h = i % 5 === 0 ? 1.35 : 1.62 + (i % 4) * 0.04;
    const p = buildSkeletonPerson(
      scene,
      bab,
      parent,
      `crowd-${i}`,
      h,
      PALETTE[i % PALETTE.length]!,
    );
    p.path = paths[i]!;
    p.seg = Math.floor(Math.random() * Math.max(1, p.path.length - 1));
    p.t = Math.random();
    p.speed = 0.95 + (i % 5) * 0.12;
    const a = p.path[p.seg]!;
    p.root.position.set(a.x, a.y, a.z);
    people.push(p);
  }

  let last = performance.now();
  const obs = scene.onBeforeRenderObservable.add(() => {
    if (parent.isDisposed()) {
      scene.onBeforeRenderObservable.remove(obs);
      return;
    }
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const p of people) advancePerson(p, dt);
  });

  return () => {
    scene.onBeforeRenderObservable.remove(obs);
    for (const p of people) p.root.dispose();
  };
}
