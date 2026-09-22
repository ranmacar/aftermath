const FLAG = "arbolis:beat1-done";

export function beat1Done(): boolean {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

function markDone(): void {
  try {
    localStorage.setItem(FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function resetBeat1(): void {
  try {
    localStorage.removeItem(FLAG);
  } catch {
    /* ignore */
  }
}

type DigoutHandle = {
  /** true if Beat 1 is showing (map should wait). */
  start(): boolean;
  dispose(): void;
};

/**
 * Beat 1 — pure Babylon: storm basement → dig out → hear the pod signal.
 * No map. Completing sets localStorage and calls onComplete.
 */
export function attachDigout(handlers: {
  onComplete: () => void;
}): DigoutHandle {
  const overlayNode = document.getElementById("digout");
  const canvasNode = document.getElementById("digout-canvas");
  const titleNode = document.getElementById("digout-title");
  const hintNode = document.getElementById("digout-hint");
  const signalNode = document.getElementById("digout-signal");
  const fwdBtn = document.getElementById("digout-fwd");
  const skipBtn = document.getElementById("digout-skip");
  if (
    !(overlayNode instanceof HTMLElement) ||
    !(canvasNode instanceof HTMLCanvasElement) ||
    !(titleNode instanceof HTMLElement) ||
    !(hintNode instanceof HTMLElement) ||
    !(signalNode instanceof HTMLElement) ||
    !(fwdBtn instanceof HTMLElement) ||
    !(skipBtn instanceof HTMLElement)
  ) {
    throw new Error("missing digout markup");
  }
  const overlay = overlayNode;
  const canvas = canvasNode;
  const title = titleNode;
  const hint = hintNode;
  const signalEl = signalNode;
  const fwd = fwdBtn;
  const skip = skipBtn;

  let engine: {
    stopRenderLoop: () => void;
    dispose: () => void;
    resize: () => void;
    getDeltaTime: () => number;
    runRenderLoop: (fn: () => void) => void;
  } | null = null;
  let sceneDispose: (() => void) | null = null;
  let running = false;
  let fwdHeld = false;
  let phase: "basement" | "tunnel" | "open" = "basement";
  let signalStrength = 0;
  let bootId = 0;

  function setHud(): void {
    if (phase === "basement") {
      title.textContent = "Basement";
      hint.textContent =
        "The storm lasted a week. You waited it out. Hold to dig toward the light.";
    } else if (phase === "tunnel") {
      title.textContent = "Digging out";
      hint.textContent = "Rubble shifts. Something is pulsing — not thunder.";
    } else {
      title.textContent = "Open air";
      hint.textContent = "A pod is signalling for help. Follow it on the map.";
    }
    const pct = Math.round(signalStrength * 100);
    signalEl.textContent =
      signalStrength > 0.05 ? `Pod signal · ${pct}%` : "…";
    signalEl.dataset.strong = signalStrength > 0.45 ? "1" : "0";
  }

  function disposeScene(): void {
    sceneDispose?.();
    sceneDispose = null;
    engine?.stopRenderLoop();
    engine?.dispose();
    engine = null;
  }

  function finish(): void {
    if (!running) return;
    running = false;
    markDone();
    disposeScene();
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    handlers.onComplete();
  }

  function dispose(): void {
    running = false;
    bootId += 1;
    disposeScene();
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  async function boot(): Promise<void> {
    const id = ++bootId;
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
    } = await import("@babylonjs/core");

    if (!running || id !== bootId) return;

    disposeScene();
    const eng = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    engine = eng;
    const sc = new Scene(eng);
    sc.clearColor = new Color4(0.02, 0.025, 0.03, 1);
    sc.gravity = new Vector3(0, -0.4, 0);
    sc.collisionsEnabled = true;
    sc.fogMode = Scene.FOGMODE_EXP2;
    sc.fogDensity = 0.045;
    sc.fogColor = new Color3(0.04, 0.05, 0.06);

    const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, 0.1), sc);
    hemi.intensity = 0.15;
    hemi.groundColor = new Color3(0.02, 0.02, 0.02);

    const bulb = new PointLight("bulb", new Vector3(0, 2.2, -1), sc);
    bulb.intensity = 0.55;
    bulb.diffuse = new Color3(1, 0.85, 0.55);

    const exitLight = new PointLight("exit", new Vector3(0, 1.2, 14), sc);
    exitLight.intensity = 0.05;
    exitLight.diffuse = new Color3(0.55, 0.7, 1);

    const signalLight = new PointLight("signal", new Vector3(8, 3, 28), sc);
    signalLight.intensity = 0;
    signalLight.diffuse = new Color3(0.45, 0.95, 0.55);

    const concrete = new StandardMaterial("concrete", sc);
    concrete.diffuseColor = new Color3(0.22, 0.22, 0.2);
    concrete.specularColor = new Color3(0.05, 0.05, 0.05);

    const dirt = new StandardMaterial("dirt", sc);
    dirt.diffuseColor = new Color3(0.18, 0.14, 0.1);

    const wood = new StandardMaterial("wood", sc);
    wood.diffuseColor = new Color3(0.28, 0.2, 0.12);

    const signalMat = new StandardMaterial("signalMat", sc);
    signalMat.diffuseColor = new Color3(0.2, 0.55, 0.3);
    signalMat.emissiveColor = new Color3(0.05, 0.2, 0.08);

    const floor = MeshBuilder.CreateBox(
      "floor",
      { width: 8, height: 0.3, depth: 10 },
      sc,
    );
    floor.position.set(0, -0.15, 2);
    floor.material = concrete;
    floor.checkCollisions = true;

    const ceiling = MeshBuilder.CreateBox(
      "ceil",
      { width: 8, height: 0.25, depth: 10 },
      sc,
    );
    ceiling.position.set(0, 2.6, 2);
    ceiling.material = concrete;
    ceiling.checkCollisions = true;

    for (const [name, x, z, w, d] of [
      ["wall-back", 0, -2.8, 8, 0.3],
      ["wall-l", -4, 2, 0.3, 10],
      ["wall-r", 4, 2, 0.3, 10],
    ] as const) {
      const wall = MeshBuilder.CreateBox(
        name,
        { width: w, height: 2.8, depth: d },
        sc,
      );
      wall.position.set(x, 1.25, z);
      wall.material = concrete;
      wall.checkCollisions = true;
    }

    const rubbleL = MeshBuilder.CreateBox(
      "rubbleL",
      { width: 2.8, height: 2.2, depth: 1.2 },
      sc,
    );
    rubbleL.position.set(-2.2, 1.0, 6.5);
    rubbleL.rotation.z = 0.2;
    rubbleL.material = dirt;
    rubbleL.checkCollisions = true;

    const rubbleR = MeshBuilder.CreateBox(
      "rubbleR",
      { width: 2.8, height: 2.4, depth: 1.4 },
      sc,
    );
    rubbleR.position.set(2.3, 1.1, 6.8);
    rubbleR.rotation.z = -0.15;
    rubbleR.material = dirt;
    rubbleR.checkCollisions = true;

    const beam = MeshBuilder.CreateBox(
      "beam",
      { width: 5.5, height: 0.25, depth: 0.35 },
      sc,
    );
    beam.position.set(0, 1.9, 6.2);
    beam.rotation.z = 0.08;
    beam.material = wood;
    beam.checkCollisions = true;

    const tunnelFloor = MeshBuilder.CreateBox(
      "tunnelFloor",
      { width: 2.2, height: 0.25, depth: 8 },
      sc,
    );
    tunnelFloor.position.set(0, 0.4, 11);
    tunnelFloor.rotation.x = -0.12;
    tunnelFloor.material = dirt;
    tunnelFloor.checkCollisions = true;

    const outside = MeshBuilder.CreateGround(
      "outside",
      { width: 40, height: 40 },
      sc,
    );
    outside.position.set(0, 1.6, 24);
    outside.material = dirt;
    outside.checkCollisions = true;

    const signalOrb = MeshBuilder.CreateSphere(
      "signalOrb",
      { diameter: 0.9 },
      sc,
    );
    signalOrb.position.set(8, 3.2, 30);
    signalOrb.material = signalMat;

    const cam = new UniversalCamera("cam", new Vector3(0, 1.5, 0.5), sc);
    cam.attachControl(canvas, true);
    cam.speed = 0;
    cam.angularSensibility = 4000;
    cam.checkCollisions = true;
    cam.applyGravity = true;
    cam.ellipsoid = new Vector3(0.35, 0.75, 0.35);
    cam.minZ = 0.05;
    sc.activeCamera = cam;

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!running) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      keys.add(e.code);
      if (
        e.code === "KeyW" ||
        e.code === "KeyA" ||
        e.code === "KeyS" ||
        e.code === "KeyD" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "KeyE" ||
        e.code === "Space"
      ) {
        e.preventDefault();
      }
      if (e.code === "KeyE" || e.code === "Space") {
        fwdHeld = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      keys.delete(e.code);
      // Clear strafe aliases if code is missing/odd
      if (e.key.toLowerCase() === "d") keys.delete("KeyD");
      if (e.code === "KeyE" || e.code === "Space") fwdHeld = false;
    };
    const onBlurKeys = (): void => {
      keys.clear();
      fwdHeld = false;
    };
    const onResize = (): void => eng.resize();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlurKeys);
    window.addEventListener("resize", onResize);

    sceneDispose = () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlurKeys);
      window.removeEventListener("resize", onResize);
      keys.clear();
      sc.dispose();
    };

    let tPulse = 0;
    eng.runRenderLoop(() => {
      if (!running || id !== bootId) return;
      const dt = Math.min(0.05, eng.getDeltaTime() / 1000);
      tPulse += dt;

      let mx = 0;
      let mz = 0;
      if (fwdHeld || keys.has("KeyW") || keys.has("ArrowUp")) mz += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) mz -= 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
      if (mx !== 0 || mz !== 0) {
        const forward = cam.getDirection(Vector3.Forward());
        forward.y = 0;
        const right = cam.getDirection(Vector3.Right());
        right.y = 0;
        if (forward.lengthSquared() > 0.0001) forward.normalize();
        if (right.lengthSquared() > 0.0001) right.normalize();
        const move = forward.scale(mz).add(right.scale(mx));
        if (move.lengthSquared() > 0.0001) {
          move.normalize();
          cam.cameraDirection.addInPlace(move.scale(2.2 * dt));
        }
      }

      const z = cam.position.z;
      if (z < 5.5) phase = "basement";
      else if (z < 16) phase = "tunnel";
      else phase = "open";

      const openAmt = Math.max(0, Math.min(1, (z - 6) / 16));
      exitLight.intensity = 0.05 + openAmt * 1.4;
      hemi.intensity = 0.15 + openAmt * 0.7;
      sc.fogDensity = 0.045 - openAmt * 0.035;
      sc.clearColor = new Color4(
        0.02 + openAmt * 0.35,
        0.025 + openAmt * 0.45,
        0.03 + openAmt * 0.55,
        1,
      );

      signalStrength = Math.max(0, Math.min(1, (z - 8) / 18));
      const pulse = 0.5 + 0.5 * Math.sin(tPulse * 4.2);
      signalLight.intensity = signalStrength * (0.4 + pulse * 0.9);
      signalMat.emissiveColor = new Color3(
        0.05 + signalStrength * 0.15,
        0.15 + signalStrength * 0.55 * pulse,
        0.08 + signalStrength * 0.2,
      );
      signalOrb.scaling.setAll(0.85 + pulse * 0.25 * Math.max(signalStrength, 0.15));

      setHud();

      if (z > 20 && signalStrength > 0.55) {
        finish();
        return;
      }

      sc.render();
    });
  }

  fwd.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    fwdHeld = true;
  });
  const releaseFwd = (): void => {
    fwdHeld = false;
  };
  fwd.addEventListener("pointerup", releaseFwd);
  fwd.addEventListener("pointerleave", releaseFwd);
  fwd.addEventListener("pointercancel", releaseFwd);
  skip.addEventListener("click", () => finish());

  function start(): boolean {
    if (beat1Done()) return false;
    running = true;
    phase = "basement";
    signalStrength = 0;
    fwdHeld = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    setHud();
    void boot().catch((err: unknown) => {
      console.error(err);
      finish();
    });
    return true;
  }

  return { start, dispose };
}
