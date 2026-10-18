/**
 * Demo loop v1 tuning (docs/design/demo-loop-v1.md). Every number the loop uses lives here.
 * Plain data so it can be swapped for JSON later without touching code.
 */
export const SPEC_V1 = {
  /** Time is simulated in steps of this many days. All durations below must be multiples of it. */
  tick: 0.5,
  travelPerRing: 0.5,
  start: { food: 8, wood: 0, stone: 0, scrap: 0, condition: 10 },
  carry: { capacity: 12, weight: { food: 1, wood: 1, stone: 2, scrap: 1 } },
  condition: {
    max: 10,
    eatPerDay: 1,
    hungryPerDay: -2,
    restAtHomePerDay: 2,
    stormOutdoorsPerDay: -3,
    stormLeanToPerDay: -1,
    stormShelterPerDay: 0,
    lowWarning: 3,
  },
  collapse: { daysLost: 2, loadKept: 0.5, wakeCondition: 4,
    /** Bob's addition, not in spec v1: emergency ration from the pod on waking, so starving can't chain collapses forever. */
    wakeFood: 3 },
  yields: {
    forest: { wood: 6, food: 1 },
    field: { food: 4, wood: 1 },
    water: { food: 3 },
    ruin: { stone: 4, scrap: 2 },
    city: { scrap: 6, food: 1 },
  },
  cityHazard: { chancePerDay: 0.15, condition: -2 },
  cityRing: 3,
  depletion: { perForageDay: 0.15, floor: 0.3, regrowPerDay: 0.03 },
  afterStorm: { scrapBonus: 0.5, scrapDays: 5, foodPenalty: -0.3, foodDays: 3 },
  gates: {
    solar: { scrap: 12, helpDays: 0.5, buildDays: 3 },
    dig: { scrap: 10, wood: 20, buildDays: 8 },
    floor: { scrap: 8, stone: 4, buildDays: 6, count: 4 },
  },
  shelter: { wood: 15, stone: 8, workDays: 2 },
  storms: { intervalMin: 8, intervalMax: 12, durationMin: 1, durationMax: 2, warningDays: 1 },
  end: { parDays: 50, softEndDay: 120 },
  hexes: { ring2Count: 12 },
};

type DeepPartial<X> = { [K in keyof X]?: X[K] extends object ? DeepPartial<X[K]> : X[K] };
export type Tuning = typeof SPEC_V1;
export type TuningPatch = DeepPartial<Tuning>;

/** Live tuning the loop reads. Starts as spec v1; swap with applyTuning() (tests, ?tuning= in the app). */
export const TUNING: Tuning = structuredClone(SPEC_V1);

export function applyTuning(patch: TuningPatch | null): Tuning {
  const fresh = structuredClone(SPEC_V1) as Record<string, unknown>;
  const merge = (dst: Record<string, unknown>, src: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === "object" && !Array.isArray(v)) merge((dst[k] ??= {}) as Record<string, unknown>, v as Record<string, unknown>);
      else dst[k] = v;
    }
  };
  if (patch) merge(fresh, patch as Record<string, unknown>);
  for (const k of Object.keys(TUNING)) delete (TUNING as Record<string, unknown>)[k];
  Object.assign(TUNING, fresh);
  return TUNING;
}

/**
 * Bob's proposed v1.1 patch for Sid (not applied by default). With spec v1 the greedy player only finishes
 * about 4 runs in 10 before day 120: food upkeep plus 15%/3% depletion eats most of the days. This patch
 * lands the greedy median at ~66 days (see loop.test.ts). Play it in the app with ?tuning=proposed.
 */
export const PROPOSED_V1_1: TuningPatch = {
  condition: { eatPerDay: 0.5 },
  depletion: { perForageDay: 0.1, regrowPerDay: 0.06 },
  yields: { city: { scrap: 8, food: 1 }, ruin: { stone: 4, scrap: 3 } },
};
