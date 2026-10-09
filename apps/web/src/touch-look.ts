/**
 * Touch drag-to-look for Babylon FreeCamera/UniversalCamera scenes.
 *
 * Babylon's FreeCameraTouchInput only yaws (vertical drag dollies, which is a
 * no-op at camera.speed 0) and rotates by distance-from-touch-start every
 * frame. This replaces it with 1:1 drag: yaw + pitch per CSS px. Mouse look
 * stays on Babylon's mouse input, so desktop is unchanged.
 *
 * One finger owns the look; other fingers (joystick, Jump, Dig) land on their
 * own elements above the canvas and never reach these listeners, so stick +
 * look works with two thumbs.
 */
export type TouchLookCamera = {
  rotation: { x: number; y: number };
  inputs: {
    removeByType: (type: string) => unknown;
    attached: Record<string, unknown>;
  };
};

export const TOUCH_LOOK_RAD_PER_PX = 0.0055;
const PITCH_LIMIT = 1.45;

/** Detach Babylon touch input and add 1:1 drag-to-look. Returns a disposer. */
export function attachTouchLook(
  canvas: HTMLElement,
  camera: TouchLookCamera,
  radPerPx = TOUCH_LOOK_RAD_PER_PX,
): () => void {
  camera.inputs.removeByType("FreeCameraTouchInput");
  const mouseInput = camera.inputs.attached["mouse"] as
    | { touchEnabled?: boolean }
    | undefined;
  if (mouseInput) mouseInput.touchEnabled = false;
  canvas.style.touchAction = "none";

  const ac = new AbortController();
  const opts = { signal: ac.signal };
  let pointer: number | null = null;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "mouse" || pointer !== null) return;
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    },
    opts,
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId !== pointer) return;
      e.preventDefault();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camera.rotation.y += dx * radPerPx;
      camera.rotation.x = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, camera.rotation.x + dy * radPerPx),
      );
    },
    opts,
  );
  const end = (e: PointerEvent): void => {
    if (e.pointerId === pointer) pointer = null;
  };
  canvas.addEventListener("pointerup", end, opts);
  canvas.addEventListener("pointercancel", end, opts);
  // iOS Safari: stop the page from scrolling / pull-to-refresh under the drag.
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (e.cancelable) e.preventDefault();
    },
    { passive: false, signal: ac.signal },
  );
  return () => ac.abort();
}
