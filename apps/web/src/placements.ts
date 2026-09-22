/** Shared architecture placed on a cell. Look and Walk both read this. */

export type Placement = {
  id: string;
  cell: string;
  kind: "pod";
  enu: [e: number, n: number, u: number];
  yaw: number;
};

/**
 * ISO 40ft shipping container (external), stood **vertical** (length up).
 * Footprint ≈ 2.44 × 2.59 m; height 12.192 m.
 * Top buried 1 m below grade; 1 m Ø column rises through grade to the solar disc.
 */
export const POD = {
  /** Vertical extent when stood on end (40 ft). */
  length: 12.192,
  width: 2.438,
  /** Cross-section "height" of a horizontal container → depth when vertical. */
  height: 2.591,
  wall: 0.08,
  buryDepth: 1,
  tubeDiameter: 1,
  /** How far the column sticks above grade before the solar mount. */
  tubeHeightAboveGrade: 2.4,
  consoleW: 0.55,
  consoleH: 1.1,
  consoleD: 0.28,
  floorH: 3.5,
  /** Optimal pitch for the solar disc (deg). */
  solarPitchDeg: 35,
} as const;

/** Tower shell — 15 m inner diameter, 20 m with roof/balconies. */
export const TOWER_SPEC = {
  innerDiameter: 15,
  outerDiameter: 20,
  floorH: 3.5,
  floorsFull: 7,
} as const;

/** Local meters from cell origin: +x east, +z north. Live quest spots. */
export const INTERACT = {
  solar: { x: 0, z: 0, r: 2.4 },
  /** Excavate under the solar roof (same axis as the column). */
  dig: { x: 0, z: 0, r: 8 },
  rise: { x: 0, z: 0.2, r: 1.8 },
} as const;

export function placementsFor(cell: string): Placement[] {
  return [
    {
      id: `${cell}:pod`,
      cell,
      kind: "pod",
      enu: [0, 0, 0],
      yaw: 0,
    },
  ];
}

export function livePodLookHeight(): number {
  return POD.tubeHeightAboveGrade + 2;
}

if (import.meta.hot) import.meta.hot.accept();
