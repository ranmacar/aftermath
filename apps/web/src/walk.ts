import { currentQuest, questStatus, type Settlement } from "@aftermath/sim";
import { habitatClusterCells, hexRingEnuRelative } from "./geo";
import { INTERACT, POD } from "./placements";
import { applyQuest, awaken } from "./settlement-store";
import { loadTerrainPatch, samplePatch } from "./terrain";
import {
  EXCAVATE_DEPTH,
  EXCAVATE_DIAMETER,
  STAGES,
  stagesWithPit,
  buildBuriedPod,
  buildConstructionStrip,
  buildHabitatStrip,
  h3AgroYaw,
  walkSurfaceY,
  BRIDGE_DECK_TOP,
  BRIDGE_HALF_WIDTH,
  type WalkLayout,
} from "./stages";
import { carveTerrainPit } from "./carve";

type WalkHandle = {
  open(cell: string, layout?: WalkLayout): void;
  close(): void;
};

const HOLD_S = 1.2;

const CAM_KEY = "aftermath-walk-cam";

type CamPose = {
  cell: string;
  layout: WalkLayout;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
};

/** Live Walk scene — strip can hot-reload without disposing engine/camera. */
type ActiveWalkSession = {
  cell: string;
  layout: WalkLayout;
  agroYaw: number;
  scene: unknown;
  bab: unknown;
  groundAt: (x: number, z: number) => number;
  strip: { dispose: (doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean) => void };
  camera: {
    position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
    rotation: { x: number; y: number; z: number };
  };
};


let activeWalk: ActiveWalkSession | null = null;

function readCam(cell: string, layout: WalkLayout): CamPose | null {
  try {
    const raw = sessionStorage.getItem(CAM_KEY);
    if (!raw) return null;
    const pose = JSON.parse(raw) as CamPose;
    if (pose.cell !== cell) return null;
    const poseLayout = pose.layout ?? "stages";
    if (poseLayout !== layout) return null;
    if (![pose.x, pose.y, pose.z, pose.rx, pose.ry, pose.rz].every(Number.isFinite)) {
      return null;
    }
    return { ...pose, layout: poseLayout };
  } catch {
    return null;
  }
}

function writeCam(
  cell: string,
  layout: WalkLayout,
  camera: ActiveWalkSession["camera"],
): void {
  const pose: CamPose = {
    cell,
    layout,
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    rx: camera.rotation.x,
    ry: camera.rotation.y,
    rz: camera.rotation.z,
  };
  try {
    sessionStorage.setItem(CAM_KEY, JSON.stringify(pose));
  } catch {
    /* private mode / quota */
  }
}

function applyCam(camera: ActiveWalkSession["camera"], pose: CamPose): void {
  camera.position.set(pose.x, pose.y, pose.z);
  camera.rotation.x = pose.rx;
  camera.rotation.y = pose.ry;
  camera.rotation.z = pose.rz;
}

async function rebuildWalkStrip(
  stagesMod?: typeof import("./stages"),
): Promise<void> {
  const session = activeWalk;
  if (!session) {
    console.info("[walk] HMR: no active Walk session — skip strip rebuild");
    return;
  }
  writeCam(session.cell, session.layout, session.camera);
  try {
    const stages = stagesMod ?? (await import("./stages"));
    // Dispose hierarchy so old doors/walls do not linger beside the new strip.
    session.strip.dispose(false, true);
    const scene = session.scene as Parameters<typeof buildConstructionStrip>[0];
    const bab = session.bab as Parameters<typeof buildConstructionStrip>[1];
    session.strip =
      session.layout === "habitat"
        ? stages.buildHabitatStrip(scene, bab, session.groundAt, session.cell)
        : stages.buildConstructionStrip(scene, bab, session.groundAt);
    const pose = readCam(session.cell, session.layout);
    if (pose) applyCam(session.camera, pose);
    console.info(`[walk] ${session.layout} strip hot-reloaded`);
  } catch (err) {
    console.error("[walk] strip HMR failed", err);
  }
}

if (import.meta.hot) {
  // Use the fresh module from the accept callback (dynamic import can be stale).
  import.meta.hot.accept("./stages", (mod) => {
    void rebuildWalkStrip(
      mod as typeof import("./stages") | undefined,
    );
  });
  import.meta.hot.accept("./placements", () => {
    void import("./stages").then((mod) => rebuildWalkStrip(mod));
  });
  // Fallback: if Vite applies the update but accept does not fire, still rebuild.
  import.meta.hot.on("vite:afterUpdate", (ev) => {
    const updates = (ev as { updates?: { path: string }[] }).updates ?? [];
    const hit = updates.some(
      (u) => u.path.includes("/stages") || u.path.includes("/placements"),
    );
    if (hit) void rebuildWalkStrip();
  });
}


export function attachWalk(handlers: { onLook?: () => void; onMap?: () => void } = {}): WalkHandle {
  const overlayNode = document.getElementById("walk");
  const canvasNode = document.getElementById("walk-canvas");
  const labelNode = document.getElementById("walk-label");
  const lookBtn = document.getElementById("walk-look");
  const mapBtn = document.getElementById("walk-map");
  const fwdBtn = document.getElementById("walk-fwd");
  const actBtn = document.getElementById("walk-act");
  const actLabelNode = document.getElementById("walk-act-label");
  const questNowNode = document.getElementById("walk-quest-now");
  const questListNode = document.getElementById("walk-quest-list");
  if (
    !(overlayNode instanceof HTMLElement) ||
    !(canvasNode instanceof HTMLCanvasElement) ||
    !(labelNode instanceof HTMLElement) ||
    !(lookBtn instanceof HTMLElement) ||
    !(mapBtn instanceof HTMLElement) ||
    !(fwdBtn instanceof HTMLElement) ||
    !(actBtn instanceof HTMLElement) ||
    !(actLabelNode instanceof HTMLElement) ||
    !(questNowNode instanceof HTMLElement) ||
    !(questListNode instanceof HTMLElement)
  ) {
    throw new Error("missing walk markup");
  }
  const overlay: HTMLElement = overlayNode;
  const canvas: HTMLCanvasElement = canvasNode;
  const label: HTMLElement = labelNode;
  const look: HTMLElement = lookBtn;
  const map: HTMLElement = mapBtn;
  const fwd: HTMLElement = fwdBtn;
  const act: HTMLElement = actBtn;
  const actLabel: HTMLElement = actLabelNode;
  const questNow: HTMLElement = questNowNode;
  const questList: HTMLElement = questListNode;

  let engine: {
    stopRenderLoop: () => void;
    dispose: () => void;
    resize: () => void;
    getDeltaTime: () => number;
    getFps: () => number;
    runRenderLoop: (fn: () => void) => void;
  } | null = null;
  let sceneDispose: (() => void) | null = null;
  let open = false;
  let fwdHeld = false;
  let actHeld = false;
  let actProgress = 0;
  let cellId: string | null = null;
  let settlement: Settlement | null = null;

  function close(): void {
    if (!open) return;
    open = false;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    act.hidden = true;
    actHeld = false;
    actProgress = 0;
    sceneDispose?.();
    sceneDispose = null;
    engine?.stopRenderLoop();
    engine?.dispose();
    engine = null;
  }

  function paintHud(s: Settlement): void {
    const now = currentQuest(s);
    questNow.textContent = now
      ? now.hint
      : "Pod is live — solar, water, and a first floor.";
    questList.replaceChildren(
      ...questStatus(s).map(({ def, done }) => {
        const li = document.createElement("li");
        li.textContent = def.title;
        li.className = done ? "is-done" : now?.id === def.id ? "is-now" : "";
        return li;
      }),
    );
  }

  async function openCell(
    cell: string,
    layout: WalkLayout = "stages",
  ): Promise<void> {
    const modeLabel = layout === "habitat" ? "Habitat" : "Walk";
    // Same cell + same layout: rebuild strip in place (HMR / refresh).
    // Layout change (Walk ↔ Habitat) needs a full remount — terrain size differs.
    if (
      open &&
      cellId === cell &&
      activeWalk &&
      activeWalk.cell === cell &&
      activeWalk.layout === layout &&
      engine
    ) {
      activeWalk.agroYaw = layout === "habitat" ? h3AgroYaw(cell) : 0;
      writeCam(cell, layout, activeWalk.camera);
      await rebuildWalkStrip();
      label.textContent = `${modeLabel} · ${cell}`;
      return;
    }
    open = true;
    cellId = cell;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    label.textContent = `${modeLabel} · loading terrain…`;
    settlement = awaken(cell);
    paintHud(settlement);

    const patch = await loadTerrainPatch(
      cell,
      layout === "habitat" ? 420 : 180,
      65,
    );
    const {
      Engine,
      Scene,
      UniversalCamera,
      HemisphericLight,
      PointLight,
      Vector3,
      Color3,
      Color4,
      MeshBuilder,
      StandardMaterial,
      Texture,
      VertexBuffer,
      VertexData,
      TransformNode,
      DynamicTexture,
    } = await import("@babylonjs/core");

    if (!open || cellId !== cell) return;
    label.textContent = `${modeLabel} · ${cell}`;
    sceneDispose?.();
    engine?.dispose();

    const eng = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    engine = eng;
    const scene = new Scene(eng);
    scene.gravity = new Vector3(0, -0.9, 0);
    scene.collisionsEnabled = true;
    scene.clearColor = new Color4(0.45, 0.62, 0.82, 1);

    const light = new HemisphericLight("sky", new Vector3(0.3, 1, 0.2), scene);
    light.intensity = 0.85;
    const interior = new PointLight("pod-light", new Vector3(0, 2.4, 0), scene);
    interior.intensity = 0.55;
    interior.diffuse = new Color3(1, 0.95, 0.8);

    const groundMat = new StandardMaterial("ground", scene);
    groundMat.diffuseColor = new Color3(0.55, 0.58, 0.5);
    groundMat.specularColor = new Color3(0.04, 0.04, 0.04);
    if (patch.texture) {
      const tex = new Texture(patch.texture.toDataURL("image/jpeg", 0.82), scene);
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      groundMat.diffuseTexture = tex;
    }

    const outlineCells =
      layout === "habitat" ? habitatClusterCells(cell) : [cell];
    const ground = MeshBuilder.CreateGround(
      "ground",
      {
        width: patch.size,
        height: patch.size,
        subdivisions: patch.cells - 1,
        updatable: true,
      },
      scene,
    );
    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i] ?? 0;
        const z = positions[i + 2] ?? 0;
        positions[i + 1] = samplePatch(patch, x, z);
      }
      ground.updateVerticesData(VertexBuffer.PositionKind, positions);
      const indices = ground.getIndices();
      const normals = ground.getVerticesData(VertexBuffer.NormalKind);
      if (indices && normals) {
        VertexData.ComputeNormals(positions, indices, normals);
        ground.updateVerticesData(VertexBuffer.NormalKind, normals);
      }
    }
    ground.refreshBoundingInfo();
    ground.material = groundMat;
    ground.checkCollisions = false; // terrain is walkSurface
    for (const hid of outlineCells) {
      const ring = hexRingEnuRelative(hid, cell);
      const outline = ring.map(
        (p) => new Vector3(p.x, samplePatch(patch, p.x, p.z) + 0.35, p.z),
      );
      if (outline[0]) outline.push(outline[0]);
      MeshBuilder.CreateLines(`hex-${hid}`, { points: outline }, scene);
    }

    const markMat = new StandardMaterial("mark", scene);
    markMat.diffuseColor = new Color3(0.78, 0.89, 0.48);
    markMat.emissiveColor = new Color3(0.18, 0.24, 0.08);
    const dirtMat = new StandardMaterial("dirt", scene);
    dirtMat.diffuseColor = new Color3(0.38, 0.32, 0.22);
    const solarMat = new StandardMaterial("solar", scene);
    solarMat.diffuseColor = new Color3(0.08, 0.12, 0.22);
    solarMat.emissiveColor = new Color3(0.05, 0.12, 0.08);

    function groundAt(x: number, z: number): number {
      return samplePatch(patch, x, z);
    }
    const agroYaw = layout === "habitat" ? h3AgroYaw(cell) : 0;

    const originY = groundAt(0, 0);
    const bab = {
      MeshBuilder,
      StandardMaterial,
      Color3,
      TransformNode,
      Vector3,
      DynamicTexture,
    };
    const live = buildBuriedPod(scene, bab, originY);
    const { consoleBox, solarPreview } = live;

    // Point light near hatch console
    interior.position.set(POD.tubeDiameter * 0.55, POD.consoleH, 0);

    const digDepth = EXCAVATE_DEPTH;
    const digDiam = EXCAVATE_DIAMETER;
    const digY = groundAt(0, 0);
    const digMark = MeshBuilder.CreateCylinder(
      "dig-mark",
      { height: 0.12, diameter: 2.2 },
      scene,
    );
    digMark.position.set(digDiam / 2 + 1.0, digY + 1.05, 0);
    digMark.material = markMat;
    // 1 m berm around live dig (shown after excavate quest)
    const digBerm = MeshBuilder.CreateTorus(
      "dig-berm",
      {
        diameter: digDiam + 5.5,
        thickness: 2.2,
        tessellation: 48,
      },
      scene,
    );
    digBerm.material = dirtMat;
    digBerm.rotation.set(0, 0, 0);
    digBerm.scaling.y = 0.7;
    digBerm.position.set(0, digY + 0.75, 0);
    digBerm.checkCollisions = false;
    digBerm.isVisible = false;
    // Beam from berm lip toward live pod hatch (walkable)
    const woodMat = new StandardMaterial("dig-beam-wood", scene);
    woodMat.diffuseColor = new Color3(0.42, 0.3, 0.16);
    const digBeamDepth = digDiam / 2 + 2.5;
    const digBeam = MeshBuilder.CreateBox(
      "dig-beam",
      { width: BRIDGE_HALF_WIDTH * 2, height: 0.28, depth: digBeamDepth },
      scene,
    );
    digBeam.material = woodMat;
    digBeam.position.set(
      0,
      digY + BRIDGE_DECK_TOP - 0.14,
      digDiam / 4 + 1.0,
    );
    digBeam.checkCollisions = false; // walk surface — floorAt owns vertical
    digBeam.isVisible = false;
    const digBeamZ0 = digBeam.position.z - digBeamDepth / 2;
    const digBeamZ1 = digBeam.position.z + digBeamDepth / 2;
    function floorAt(x: number, z: number, footY: number): number {
      const terrain = samplePatch(patch, x, z);
      let y = walkSurfaceY(
        x,
        z,
        terrain,
        groundAt,
        footY,
        layout,
        agroYaw,
        layout === "habitat" ? cell : null,
      );
      // Live dig bridge at origin (visible after dig quest)
      if (
        digBeam.isVisible &&
        Math.abs(x) <= BRIDGE_HALF_WIDTH + 0.05 &&
        z >= digBeamZ0 - 0.1 &&
        z <= digBeamZ1 + 0.1
      ) {
        const deck = digY + BRIDGE_DECK_TOP;
        if (deck <= footY + STEP_HEIGHT && deck > y) y = deck;
      }
      return y;
    }

    let liveDigCarved = false;
    function applyLiveDigCarve(): void {
      if (liveDigCarved) return;
      liveDigCarved = true;
      carveTerrainPit(
        ground,
        0,
        0,
        digDiam / 2,
        digY,
        digDepth,
      );
    }

    const riseStub = MeshBuilder.CreateCylinder(
      "rise-stub",
      { height: POD.floorH, diameter: 12, tessellation: 28 },
      scene,
    );
    riseStub.material = markMat;
    riseStub.position.set(0, originY + POD.floorH / 2, 0);
    riseStub.isVisible = false;

    const marker = MeshBuilder.CreateTorus(
      "marker",
      { diameter: 1.6, thickness: 0.08, tessellation: 20 },
      scene,
    );
    marker.material = markMat;
    marker.rotation.set(0, 0, 0);

    function syncVisuals(s: Settlement): void {
      if (layout === "habitat") {
        // Finished tower owns the cell — hide dig / rise stubs that sit under it.
        interior.intensity = 0.85;
        solarPreview.isVisible = false;
        digBerm.isVisible = false;
        digBeam.isVisible = false;
        digMark.isVisible = false;
        consoleBox.isVisible = false;
        riseStub.isVisible = false;
        marker.isVisible = false;
        return;
      }
      interior.intensity = s.power > 0 ? 1.05 : 0.45;
      solarPreview.isVisible = s.power > 0;
      if (s.power > 0) {
        solarPreview.material = solarMat;
        const ang = (POD.solarPitchDeg * Math.PI) / 180;
        solarPreview.rotation.x = -ang;
      }
      digBerm.isVisible = s.water > 0;
      digBeam.isVisible = s.water > 0;
      if (s.water > 0) applyLiveDigCarve();
      digMark.isVisible = currentQuest(s)?.id === "dig";
      consoleBox.isVisible = true;
      riseStub.isVisible = s.floors > 0;
      if (s.floors > 0) {
        riseStub.scaling.y = s.floors;
        riseStub.position.y = originY + (POD.floorH * s.floors) / 2;
      }
      const q = currentQuest(s);
      if (!q) {
        marker.isVisible = false;
        return;
      }
      const spot = INTERACT[q.id];
      const y =
        q.id === "dig"
          ? groundAt(spot.x, spot.z) + 0.12
          : q.id === "solar"
            ? originY + 0.1
            : originY + 0.15;
      marker.isVisible = true;
      marker.position.set(spot.x, y, spot.z);
    }

    syncVisuals(settlement);

    const strip =
      layout === "habitat"
        ? buildHabitatStrip(scene, bab, groundAt, cell)
        : buildConstructionStrip(scene, bab, groundAt);

    // Punch reference excavate stage (and live dig when already done) through terrain
    if (layout === "stages") {
      const pitIds = new Set(stagesWithPit());
      for (const stage of STAGES) {
        if (!pitIds.has(stage.id)) continue;
        const gy = groundAt(stage.x, stage.z);
        carveTerrainPit(
          ground,
          stage.x,
          stage.z,
          EXCAVATE_DIAMETER / 2,
          gy,
          EXCAVATE_DEPTH,
        );
      }
      if (settlement && settlement.water > 0) applyLiveDigCarve();
    }


    // Human 1:1: adult eye ~1.65 m. Spawn outside the 15 m roof so 12 m ID reads.
    const spawnZ = 22; // outside 20 m OD
    const spawnY = groundAt(0, spawnZ);
    // Camera Y is the eye. 1.65 m ≈ standing adult vs the 1.75 m figures.
    const eyeH = 1.65;
    const camera = new UniversalCamera(
      "eye",
      new Vector3(0, spawnY + eyeH + 0.05, spawnZ),
      scene,
    );
    camera.setTarget(new Vector3(0, originY + 1.1, 0));
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    camera.attachControl(canvas, true);
    camera.fov = 0.9; // ~52° vFOV, closer to human; wide FOV shrinks scale
    camera.speed = 0;
    camera.inertia = 0.5;
    camera.angularSensibility = 900; // lower = faster mouse look
    // Ground snap owns floors/bridges; no mesh wall collision.
    let lastFps = 0;
    let fpsAcc = 0;
    let flying = false;
    const syncHud = (fps?: number): void => {
      if (fps !== undefined) lastFps = fps;
      const mode = flying ? "Fly" : modeLabel;
      label.textContent = `${mode} · ${cell} · ${lastFps} fps`;
    };
    camera.checkCollisions = false;
    camera.applyGravity = false;
    camera.minZ = 0.08;
    // Strip built-in keyboard move entirely (camera.keys* alone does not always clear the input).
    camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
    canvas.focus();

    const pose = readCam(cell, layout);
    if (pose) applyCam(camera, pose);
    activeWalk = {
      cell,
      layout,
      agroYaw,
      scene,
      bab,
      groundAt,
      strip,
      camera,
    };
    writeCam(cell, layout, camera);
    syncHud();


    const moveKeys = new Set<string>();
    let vy = 0;
    let grounded = true;
    let spaceDown = false;
    let spaceHoldAcc = 0;
    let spaceArmedJump = false; // short tap → jump / exit fly
    let camSaveAcc = 0;
    const WALK_SPEED = 2.2;
    const RUN_SPEED = 8.5;
    const FLY_SPEED = 12;
    const FLY_FAST = 28;
    const JUMP_SPEED = 4.2;
    const GRAVITY = -16;
    const STEP_HEIGHT = 1.35; // berm / small ledges
    const FLY_HOLD_S = 0.45; // hold Space this long to enter fly

    const press = (e: KeyboardEvent, down: boolean): void => {
      if (!open) return;
      const codes: string[] = [];
      if (e.code) codes.push(e.code);
      // Fallbacks — some layouts/extensions make code flaky for unmodified letters.
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
      if (k === "w" || e.keyCode === 87) codes.push("KeyW");
      if (k === "a" || e.keyCode === 65) codes.push("KeyA");
      if (k === "s" || e.keyCode === 83) codes.push("KeyS");
      if (k === "d" || e.keyCode === 68) codes.push("KeyD");
      if (k === "l" || e.keyCode === 76) codes.push("KeyL"); // backup strafe right
      if (k === "j" || e.keyCode === 74) codes.push("KeyJ"); // backup strafe left
      if (k === "c" || e.keyCode === 67) codes.push("KeyC"); // fly descend
      if (k === " " || e.code === "Space") codes.push("Space");
      if (k === "shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        codes.push(e.code === "ShiftRight" ? "ShiftRight" : "ShiftLeft");
      }
      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        codes.push(e.code);
      }
      if (
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight"
      ) {
        codes.push(e.code);
      }

      const interesting = codes.some((c) =>
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "KeyL",
          "KeyJ",
          "KeyC",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "ShiftLeft",
          "ShiftRight",
          "ControlLeft",
          "ControlRight",
          "Space",
        ].includes(c),
      );
      if (!interesting) return;
      e.preventDefault();
      if (down) canvas.focus();

      for (const c of codes) {
        if (c === "Space") {
          if (down && !e.repeat) {
            spaceDown = true;
            spaceHoldAcc = 0;
            spaceArmedJump = true;
          }
          if (!down) {
            if (spaceArmedJump && spaceHoldAcc < FLY_HOLD_S) {
              if (flying) {
                flying = false;
                vy = 0;
              } else if (grounded) {
                vy = JUMP_SPEED;
                grounded = false;
              }
            }
            spaceDown = false;
            spaceArmedJump = false;
            spaceHoldAcc = 0;
          }
          continue;
        }
        if (down) moveKeys.add(c);
        else moveKeys.delete(c);
      }
    };
    const onMoveKeyDown = (e: KeyboardEvent): void => press(e, true);
    const onMoveKeyUp = (e: KeyboardEvent): void => press(e, false);
    window.addEventListener("keydown", onMoveKeyDown, true);
    window.addEventListener("keyup", onMoveKeyUp, true);
    canvas.addEventListener("keydown", onMoveKeyDown);
    canvas.addEventListener("keyup", onMoveKeyUp);

    function nearCurrent(): ReturnType<typeof currentQuest> {
      if (!settlement) return null;
      const q = currentQuest(settlement);
      if (!q) return null;
      const spot = INTERACT[q.id];
      const dx = camera.position.x - spot.x;
      const dz = camera.position.z - spot.z;
      if (Math.hypot(dx, dz) > spot.r) return null;
      return q;
    }

    scene.registerBeforeRender(() => {
      const dt = Math.min(0.05, eng.getDeltaTime() / 1000);
      camSaveAcc += dt;
      if (camSaveAcc >= 1) {
        camSaveAcc = 0;
        writeCam(cell, layout, camera);
      }
      fpsAcc += dt;
      if (fpsAcc >= 0.25) {
        fpsAcc = 0;
        syncHud(Math.round(eng.getFps()));
      }
      if (spaceDown) {
        spaceHoldAcc += dt;
        if (!flying && spaceHoldAcc >= FLY_HOLD_S) {
          flying = true;
          spaceArmedJump = false; // hold consumed — not a jump
          vy = 0;
          grounded = false;
          syncHud();
        }
      }

      const running =
        moveKeys.has("ShiftLeft") || moveKeys.has("ShiftRight");
      let mx = 0;
      let mz = 0;
      if (fwdHeld || moveKeys.has("KeyW") || moveKeys.has("ArrowUp")) mz += 1;
      if (moveKeys.has("KeyS") || moveKeys.has("ArrowDown")) mz -= 1;
      if (moveKeys.has("KeyA") || moveKeys.has("KeyJ") || moveKeys.has("ArrowLeft"))
        mx -= 1;
      if (moveKeys.has("KeyD") || moveKeys.has("KeyL") || moveKeys.has("ArrowRight"))
        mx += 1;

      if (flying) {
        const speed = (running ? FLY_FAST : FLY_SPEED) * dt;
        // Full look-direction flight (includes pitch).
        if (mx !== 0 || mz !== 0) {
          const world = camera.getDirection(new Vector3(mx, 0, mz));
          if (world.lengthSquared() >= 1e-6) {
            world.normalize();
            camera.position.addInPlace(world.scale(speed));
          }
        }
        let my = 0;
        if (spaceDown) my += 1;
        if (
          moveKeys.has("KeyC") ||
          moveKeys.has("ControlLeft") ||
          moveKeys.has("ControlRight")
        ) {
          my -= 1;
        }
        if (my !== 0) camera.position.y += my * speed;
      } else {
        const speed = (running ? RUN_SPEED : WALK_SPEED) * dt;
        if (mx !== 0 || mz !== 0) {
          // Local camera space: +X right, +Z forward (Babylon). One call avoids Right()/Cross bugs.
          const world = camera.getDirection(new Vector3(mx, 0, mz));
          world.y = 0;
          if (world.lengthSquared() >= 1e-6) {
            world.normalize();
            const before = camera.position.clone();
            const diff = world.scale(speed);
            diff.y = 0;
            camera.position.x = before.x + diff.x;
            camera.position.z = before.z + diff.z;
            const sole = camera.position.y - eyeH;
            const gNext = floorAt(camera.position.x, camera.position.z, sole);
            const rise = gNext - sole;
            if (rise > 0 && rise <= STEP_HEIGHT) {
              camera.position.y = gNext + eyeH;
              vy = 0;
              grounded = true;
            } else {
              camera.position.y = before.y;
            }
          }
        }

        // Gravity vs terrain (short Space tap jumps via keyup)
        vy += GRAVITY * dt;
        camera.position.y += vy * dt;
        const soleNow = camera.position.y - eyeH;
        const gHere = floorAt(camera.position.x, camera.position.z, soleNow);
        const floorEye = gHere + eyeH;
        if (camera.position.y <= floorEye) {
          camera.position.y = floorEye;
          vy = 0;
          grounded = true;
        }
      }

      const q = nearCurrent();
      if (q) {
        act.hidden = false;
        actLabel.textContent = q.prompt;
      } else {
        act.hidden = true;
        actHeld = false;
        actProgress = 0;
      }

      if (actHeld && q && cellId) {
        actProgress += dt;
        const p = Math.min(1, actProgress / HOLD_S);
        act.style.setProperty("--p", String(p));
        if (p >= 1) {
          settlement = applyQuest(cellId, q.id);
          paintHud(settlement);
          syncVisuals(settlement);
          actHeld = false;
          actProgress = 0;
          act.style.setProperty("--p", "0");
        }
      } else {
        act.style.setProperty("--p", "0");
      }
    });

    const loop = (): void => {
      scene.render();
    };
    eng.runRenderLoop(loop);
    const onResize = (): void => eng.resize();
    window.addEventListener("resize", onResize);
    sceneDispose = () => {
      writeCam(cell, layout, camera);
      if (activeWalk?.cell === cell) activeWalk = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onMoveKeyDown, true);
      window.removeEventListener("keyup", onMoveKeyUp, true);
      canvas.removeEventListener("keydown", onMoveKeyDown);
      canvas.removeEventListener("keyup", onMoveKeyUp);
      moveKeys.clear();
      scene.dispose();
    };
  }

  look.addEventListener("click", () => {
    close();
    handlers.onLook?.();
  });
  map.addEventListener("click", () => {
    close();
    handlers.onMap?.();
  });
  const holdFwd = (on: boolean) => () => {
    fwdHeld = on;
  };
  fwd.addEventListener("pointerdown", holdFwd(true));
  fwd.addEventListener("pointerup", holdFwd(false));
  fwd.addEventListener("pointerleave", holdFwd(false));
  fwd.addEventListener("pointercancel", holdFwd(false));
  const holdAct = (on: boolean) => () => {
    actHeld = on;
    if (!on) actProgress = 0;
  };
  act.addEventListener("pointerdown", holdAct(true));
  act.addEventListener("pointerup", holdAct(false));
  act.addEventListener("pointerleave", holdAct(false));
  act.addEventListener("pointercancel", holdAct(false));
  window.addEventListener("keydown", (event) => {
    if (!open || event.code !== "KeyE") return;
    actHeld = true;
  });
  window.addEventListener("keyup", (event) => {
    if (event.code !== "KeyE") return;
    actHeld = false;
    actProgress = 0;
  });

  return {
    open: (cell, layout = "stages") => void openCell(cell, layout),
    close,
  };
}
