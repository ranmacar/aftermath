/**
 * Demo loop tuning (docs/design/demo-loop-v1.md). Every number and rule switch the loop uses lives here.
 * Plain data so it can be swapped for JSON later without touching code.
 * SPEC_V1 is Sid's original sheet; V1_1, V1_2 and V1_3 are patches on top of it. The live default is v1.3.
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
  /**
   * The city edge hex sits at this ring (default 3). Future rule (not wired, needs OSM landuse):
   * use the nearest built-up hex, clamped to rings 2-4.
   */
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
  rules: {
    /** v1: only floors can be paid one ahead. v1.2: every gate opens for payment as soon as the one before starts building. */
    payAheadAll: false,
    /** v1: a storm warning mid-trip just stops the clock. v1.2: the player chooses to wait it out or turn back. */
    stormChoice: false,
  },
  /** Greedy test player only (greedy.ts), not game rules. */
  bot: {
    /** Turn back on a mid-trip storm warning if Condition would end the storm at or below this. */
    stormTurnBackAt: 3,
  },
};

type DeepPartial<X> = { [K in keyof X]?: X[K] extends object ? DeepPartial<X[K]> : X[K] };
export type Tuning = typeof SPEC_V1;
export type TuningPatch = DeepPartial<Tuning>;

const merge = (dst: Record<string, unknown>, src: Record<string, unknown>) => {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v)) merge((dst[k] ??= {}) as Record<string, unknown>, v as Record<string, unknown>);
    else dst[k] = v;
  }
  return dst;
};
const build = (patch: TuningPatch | null): Tuning => (patch ? merge(structuredClone(SPEC_V1) as Record<string, unknown>, patch as Record<string, unknown>) : structuredClone(SPEC_V1)) as Tuning;

/**
 * v1.1 (blessed by Sid as the new base): halves food upkeep, softens depletion, richer city and ruin.
 * With spec v1 the greedy player only finishes about 4 runs in 10 before day 120.
 */
export const V1_1: TuningPatch = {
  condition: { eatPerDay: 0.5 },
  depletion: { perForageDay: 0.1, regrowPerDay: 0.06 },
  yields: { city: { scrap: 8, food: 1 }, ruin: { stone: 4, scrap: 3 } },
};
/** @deprecated old name for V1_1 (?tuning=proposed). */
export const PROPOSED_V1_1 = V1_1;

/**
 * v1.2 (Sid, 2026-10-18): v1.1 + pay one gate ahead everywhere, par 55, mid-trip storm choice.
 * City scrap 8 → 9 was Sid's fallback step because the greedy median stayed above 62 with pay-ahead alone;
 * it did not move the median (see the changelog in docs/design/demo-loop-v1.md).
 */
export const V1_2: TuningPatch = merge(structuredClone(V1_1) as Record<string, unknown>, {
  end: { parDays: 55 },
  yields: { city: { scrap: 9 } },
  rules: { payAheadAll: true, stormChoice: true },
}) as TuningPatch;

/** v1.3 (Sid's final pass, 2026-10-18): v1.2 with G2 Dig wood 20 → 12 and par 60. */
export const V1_3: TuningPatch = merge(structuredClone(V1_2) as Record<string, unknown>, {
  gates: { dig: { wood: 12 } },
  end: { parDays: 60 },
}) as TuningPatch;

export const TUNINGS = { "v1": null, "v1.1": V1_1, "v1.2": V1_2, "v1.3": V1_3 } as const satisfies Record<string, TuningPatch | null>;
export type TuningName = keyof typeof TUNINGS;
export const DEFAULT_TUNING: TuningName = "v1.3";
/** ?tuning= values: v1, v1.1, v1.2, v1.3 (and the old "proposed" for v1.1). Unknown or missing → default. */
export function tuningName(param: string | null | undefined): TuningName {
  if (param === "proposed") return "v1.1";
  return param && param in TUNINGS ? (param as TuningName) : DEFAULT_TUNING;
}

/** Live tuning the loop reads. Starts at the default (v1.3); swap with useTuning()/applyTuning(). */
export const TUNING: Tuning = build(TUNINGS[DEFAULT_TUNING]);

/** Replace the live tuning with spec v1 plus `patch` (null = plain spec v1). */
export function applyTuning(patch: TuningPatch | null): Tuning {
  const fresh = build(patch);
  for (const k of Object.keys(TUNING)) delete (TUNING as Record<string, unknown>)[k];
  Object.assign(TUNING, fresh);
  return TUNING;
}
export const useTuning = (name: TuningName): Tuning => applyTuning(TUNINGS[name]);
