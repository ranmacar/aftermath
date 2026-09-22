/**
 * Agrokruh cultivation schedule: each of the 18 circles has exactly one
 * crop / cultivation work active on any day of the year.
 *
 * Bed indices match `agrokruhBeds(yaw)` order in stages.ts
 * (axial q,r with hex distance 1 then 2, q-major nested loops).
 */

import { getCrop, type CropId } from "./crops.ts";

export type AgroRing = 1 | 2;

export type AgroBedRef = {
  /** Index into agrokruhBeds() / schedule arrays (0..17). */
  bedIndex: number;
  /** Stable id from axial coords. */
  id: string;
  q: number;
  r: number;
  ring: AgroRing;
};

export type CultivationWork =
  | { kind: "crop"; cropId: CropId | string }
  | { kind: "prep"; cropId: CropId | string }
  | {
      kind: "maintain";
      cropId: CropId | string;
      /** e.g. mulch, runners, renovate, spring-clean */
      task?: string;
    }
  | { kind: "harvest"; cropId: CropId | string }
  | { kind: "fallow" }
  | { kind: "cover"; cropId?: CropId | string };

export type BedScheduleEntry = {
  bedIndex: number;
  /** Inclusive day-of-year 1..365. */
  startDay: number;
  /** Inclusive day-of-year 1..365. */
  endDay: number;
  work: CultivationWork;
};

export type SeasonSchedule = {
  id: string;
  label: string;
  /** Climate / framing note. */
  notes: string;
  entries: readonly BedScheduleEntry[];
};

function agroHexDist(q: number, r: number): number {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

/** Same enumeration order as stages.agrokruhBeds. */
export function agroBedRefs(): AgroBedRef[] {
  const beds: AgroBedRef[] = [];
  let bedIndex = 0;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const d = agroHexDist(q, r);
      if (d !== 1 && d !== 2) continue;
      beds.push({
        bedIndex,
        id: `bed-q${q}-r${r}`,
        q,
        r,
        ring: d as AgroRing,
      });
      bedIndex++;
    }
  }
  return beds;
}

export const AGRO_BED_COUNT = 18;

export function dayOfYearFromDate(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((now - start) / 86_400_000);
}

function inRange(day: number, start: number, end: number): boolean {
  return day >= start && day <= end;
}

/** The single active work on a bed for a day-of-year (1..365). */
export function workOnBed(
  schedule: SeasonSchedule,
  bedIndex: number,
  dayOfYear: number,
): CultivationWork | null {
  const day = ((Math.floor(dayOfYear) - 1) % 365) + 1;
  for (const e of schedule.entries) {
    if (e.bedIndex !== bedIndex) continue;
    if (inRange(day, e.startDay, e.endDay)) return e.work;
  }
  return null;
}

/** Snapshot: one work per bed (length 18). */
export function scheduleSnapshot(
  schedule: SeasonSchedule,
  dayOfYear: number,
): (CultivationWork | null)[] {
  return Array.from({ length: AGRO_BED_COUNT }, (_, i) =>
    workOnBed(schedule, i, dayOfYear),
  );
}

export function cropIdOf(work: CultivationWork | null): string | null {
  if (!work) return null;
  if (work.kind === "fallow") return null;
  if (work.kind === "cover") return work.cropId ?? null;
  return work.cropId;
}

/**
 * Validates exclusive occupancy: every bed, every day 1..365 has exactly one entry.
 * Returns list of error strings (empty = ok).
 */
export function validateSchedule(schedule: SeasonSchedule): string[] {
  const errors: string[] = [];
  for (let b = 0; b < AGRO_BED_COUNT; b++) {
    const hits = new Array<number>(366).fill(0);
    for (const e of schedule.entries) {
      if (e.bedIndex !== b) continue;
      if (e.startDay < 1 || e.endDay > 365 || e.startDay > e.endDay) {
        errors.push(
          `bed ${b}: bad range ${e.startDay}–${e.endDay}`,
        );
        continue;
      }
      for (let d = e.startDay; d <= e.endDay; d++) hits[d]!++;
    }
    for (let d = 1; d <= 365; d++) {
      if (hits[d] !== 1) {
        errors.push(`bed ${b} day ${d}: ${hits[d]} works (want 1)`);
        if (errors.length > 40) return errors;
      }
    }
  }
  return errors;
}

function entry(
  bedIndex: number,
  startDay: number,
  endDay: number,
  work: CultivationWork,
): BedScheduleEntry {
  return { bedIndex, startDay, endDay, work };
}

/** Default demo year: one cultivation per circle, CZ-ish calendar. */
export const DEMO_YEAR_SCHEDULE: SeasonSchedule = {
  id: "demo-year-1",
  label: "Demo year — one crop per circle",
  notes:
    "Each of 18 Agrokruh beds has exclusive occupancy year-round (prep → crop → fallow; strawberry uses maintain/harvest cycles). Shrubs/trees stay off-bed in interspaces.",
  entries: [
  entry(0, 1, 90, { kind: "fallow" }),
  entry(0, 91, 104, { kind: "prep", cropId: "potato" }),
  entry(0, 105, 209, { kind: "crop", cropId: "potato" }),
  entry(0, 210, 365, { kind: "fallow" }),
  entry(1, 1, 75, { kind: "fallow" }),
  entry(1, 76, 89, { kind: "prep", cropId: "carrot" }),
  entry(1, 90, 179, { kind: "crop", cropId: "carrot" }),
  entry(1, 180, 365, { kind: "fallow" }),
  entry(2, 1, 95, { kind: "fallow" }),
  entry(2, 96, 109, { kind: "prep", cropId: "beet" }),
  entry(2, 110, 174, { kind: "crop", cropId: "beet" }),
  entry(2, 175, 365, { kind: "fallow" }),
  entry(3, 1, 65, { kind: "fallow" }),
  entry(3, 66, 79, { kind: "prep", cropId: "onion" }),
  entry(3, 80, 189, { kind: "crop", cropId: "onion" }),
  entry(3, 190, 365, { kind: "fallow" }),
  entry(4, 1, 105, { kind: "fallow" }),
  entry(4, 106, 119, { kind: "prep", cropId: "cabbage" }),
  entry(4, 120, 214, { kind: "crop", cropId: "cabbage" }),
  entry(4, 215, 365, { kind: "fallow" }),
  entry(5, 1, 115, { kind: "fallow" }),
  entry(5, 116, 129, { kind: "prep", cropId: "kale" }),
  entry(5, 130, 189, { kind: "crop", cropId: "kale" }),
  entry(5, 190, 365, { kind: "fallow" }),
  entry(6, 1, 125, { kind: "fallow" }),
  entry(6, 126, 139, { kind: "prep", cropId: "tomato-outdoor" }),
  entry(6, 140, 224, { kind: "crop", cropId: "tomato-outdoor" }),
  entry(6, 225, 365, { kind: "fallow" }),
  entry(7, 1, 130, { kind: "fallow" }),
  entry(7, 131, 144, { kind: "prep", cropId: "zucchini" }),
  entry(7, 145, 199, { kind: "crop", cropId: "zucchini" }),
  entry(7, 200, 365, { kind: "fallow" }),
  entry(8, 1, 135, { kind: "fallow" }),
  entry(8, 136, 149, { kind: "prep", cropId: "cucumber" }),
  entry(8, 150, 209, { kind: "crop", cropId: "cucumber" }),
  entry(8, 210, 365, { kind: "fallow" }),
  entry(9, 1, 85, { kind: "fallow" }),
  entry(9, 86, 99, { kind: "prep", cropId: "lettuce" }),
  entry(9, 100, 149, { kind: "crop", cropId: "lettuce" }),
  entry(9, 150, 365, { kind: "fallow" }),
  entry(10, 1, 70, { kind: "fallow" }),
  entry(10, 71, 84, { kind: "prep", cropId: "spinach" }),
  entry(10, 85, 124, { kind: "crop", cropId: "spinach" }),
  entry(10, 125, 365, { kind: "fallow" }),
  entry(11, 1, 60, { kind: "fallow" }),
  entry(11, 61, 74, { kind: "prep", cropId: "pea" }),
  entry(11, 75, 144, { kind: "crop", cropId: "pea" }),
  entry(11, 145, 365, { kind: "fallow" }),
  entry(12, 1, 130, { kind: "fallow" }),
  entry(12, 131, 144, { kind: "prep", cropId: "bush-bean" }),
  entry(12, 145, 199, { kind: "crop", cropId: "bush-bean" }),
  entry(12, 200, 365, { kind: "fallow" }),
  entry(13, 1, 55, { kind: "fallow" }),
  entry(13, 56, 69, { kind: "prep", cropId: "fava-bean" }),
  entry(13, 70, 179, { kind: "crop", cropId: "fava-bean" }),
  entry(13, 180, 365, { kind: "fallow" }),
  // Strawberry perennial (June-bearing CZ): maintain / grow / harvest cycles
  entry(14, 1, 74, { kind: "maintain", cropId: "strawberry", task: "winter-mulch" }),
  entry(14, 75, 104, { kind: "maintain", cropId: "strawberry", task: "spring-clean" }),
  entry(14, 105, 151, { kind: "crop", cropId: "strawberry" }),
  entry(14, 152, 196, { kind: "harvest", cropId: "strawberry" }),
  entry(14, 197, 243, { kind: "maintain", cropId: "strawberry", task: "renovate-runners" }),
  entry(14, 244, 304, { kind: "maintain", cropId: "strawberry", task: "autumn-care" }),
  entry(14, 305, 365, { kind: "maintain", cropId: "strawberry", task: "winter-mulch" }),
  entry(15, 1, 185, { kind: "fallow" }),
  entry(15, 186, 199, { kind: "prep", cropId: "carrot" }),
  entry(15, 200, 289, { kind: "crop", cropId: "carrot" }),
  entry(15, 290, 365, { kind: "fallow" }),
  entry(16, 1, 45, { kind: "fallow" }),
  entry(16, 46, 59, { kind: "prep", cropId: "cabbage" }),
  entry(16, 60, 154, { kind: "crop", cropId: "cabbage" }),
  entry(16, 155, 365, { kind: "fallow" }),
  entry(17, 1, 100, { kind: "fallow" }),
  entry(17, 101, 114, { kind: "prep", cropId: "potato" }),
  entry(17, 115, 219, { kind: "crop", cropId: "potato" }),
  entry(17, 220, 365, { kind: "fallow" }),
  ],
};

/**
 * Standing crop id on each bed for a day.
 * Includes prep/maintain/harvest (perennials stay planted); null only for fallow.
 */
export function bedCropsAt(
  dayOfYear: number,
  schedule: SeasonSchedule = DEMO_YEAR_SCHEDULE,
): (string | null)[] {
  return scheduleSnapshot(schedule, dayOfYear).map((w) => cropIdOf(w));
}

export function describeBedWork(work: CultivationWork | null): string {
  if (!work) return "unknown";
  if (work.kind === "fallow") return "fallow";
  if (work.kind === "prep") {
    const c = getCrop(work.cropId);
    return `prep ${c?.name ?? work.cropId}`;
  }
  if (work.kind === "maintain") {
    const c = getCrop(work.cropId);
    const name = c?.name ?? work.cropId;
    return work.task ? `maintain ${name} (${work.task})` : `maintain ${name}`;
  }
  if (work.kind === "harvest") {
    const c = getCrop(work.cropId);
    return `harvest ${c?.name ?? work.cropId}`;
  }
  if (work.kind === "cover") {
    return work.cropId ? `cover ${work.cropId}` : "cover";
  }
  const c = getCrop(work.cropId);
  return c?.name ?? work.cropId;
}

/** True when the bed is in an active harvest window. */
export function isHarvesting(work: CultivationWork | null): boolean {
  return work?.kind === "harvest";
}
