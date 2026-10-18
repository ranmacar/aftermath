/**
 * A simple rule-based greedy player for headless playthroughs and balance checks. Not used by the game UI.
 * Each time it is home: deliver everything, do any home work, rest if worn out or a storm is due,
 * otherwise go where the best yield for the most urgent need is (food first if the larder is short),
 * staying until the bag is about full. It only knows what the player knows (the 1-day storm warning).
 */
import { TUNING as T } from "./tuning.ts";
import {
  RESOURCES, type Hex, type Res, type Run, type Stock, advance, canHelp, canWorkShelter, dayYield, deliver, forecast,
  generateHexes, helpUnfold, isDone, newRun, owed, rest, shelterOwed, startTrip, stormAt, travelDays, weightOf, workShelter,
} from "./loop.ts";

const z = (): Stock => ({ food: 0, wood: 0, stone: 0, scrap: 0 });

/** Outstanding needs, most urgent first: open pod gates, then the shelter, then gates not yet open. */
function needs(run: Run): Stock[] {
  const open = z(), shelter = z(), later = z();
  for (const s of run.stages) { const o = owed(s); for (const r of RESOURCES) { if (s.status === "open") open[r] += o[r]; else if (s.status === "locked") later[r] += o[r]; } }
  if (!run.shelter.done && isDone(run, "solar")) { const o = shelterOwed(run); shelter.wood += o.wood; shelter.stone += o.stone; }
  const left = { ...run.stock };
  return [open, shelter, later].map((n) => { const out = z(); for (const r of RESOURCES) { const m = Math.min(left[r], n[r]); left[r] -= m; out[r] = n[r] - m; } return out; });
}

/** Simulate `days` forage days on a hex keeping only `want`, return what fits in the bag. */
function haul(run: Run, hex: Hex, days: number, keep: Res[]): Stock {
  const got = z(); let mult = hex.mult;
  for (let k = 0; k < days; k++) {
    const y = dayYield(run, { ...hex, mult }); mult = Math.max(T.depletion.floor, mult - T.depletion.perForageDay);
    for (const r of keep) { const room = Math.floor((T.carry.capacity - weightOf(got)) / T.carry.weight[r]); got[r] += Math.max(0, Math.min(y[r], room)); }
  }
  return got;
}

function bestTrip(run: Run, value: (got: Stock) => number, keep: Res[]): { hex: Hex; days: number; score: number } | null {
  const fc = forecast(run); let best: { hex: Hex; days: number; score: number } | null = null;
  for (const hex of run.hexes) for (let d = 1; d <= 4; d++) {
    const total = travelDays(hex) * 2 + d;
    if (fc && fc.start < run.day + total) continue;
    if (run.stock.food < total && keep[0] !== "food" && hex.type !== "field") continue; // don't starve on the road
    const score = value(haul(run, hex, d, keep)) / total;
    if (!best || score > best.score + 1e-9) best = { hex, days: d, score };
  }
  return best;
}

export function greedyStep(run: Run): Run { return advance(greedyDecide(run)).run; }

/** Pick the next action when home (no time passes). */
export function greedyDecide(run: Run): Run {
  if (run.activity.kind !== "home") return run;
  let r = deliver(run, "gate");
  r = deliver(r, "shelter");
  if (canHelp(r)) return helpUnfold(r);
  if (canWorkShelter(r)) return workShelter(r);
  if (stormAt(r, r.day) || (r.condition <= 4 && r.stock.food > 0)) return rest(r, 1);
  const fc = forecast(r);
  if (fc && fc.start - r.day <= 1.5) return rest(r, Math.max(1, fc.end - r.day));

  // Food first if the larder won't cover the next few days.
  if (r.stock.food < 6) {
    const t = bestTrip(r, (g) => g.food, ["food", "scrap", "wood", "stone"]);
    if (t) return startTrip(r, t.hex.id, t.days, ["food", "scrap", "wood", "stone"]);
  }
  const [open, shelter, later] = needs(r);
  const W = [3, 1.5, 1];
  const need = z(); for (const x of RESOURCES) need[x] = open![x] + shelter![x] + later![x];
  if (RESOURCES.some((x) => need[x] > 0)) {
    const keep = [...RESOURCES].filter((x) => x !== "food").sort((a, b) => (open![b] * 3 + need[b]) - (open![a] * 3 + need[a])) as Res[];
    keep.push("food");
    const value = (g: Stock) => RESOURCES.reduce((v, x) => {
      let left = g[x], acc = 0;
      [open!, shelter!, later!].forEach((n, i) => { const m = Math.min(left, n[x]); left -= m; acc += m * W[i]!; });
      return v + acc * (x === "stone" ? 1.5 : 1);
    }, 0);
    const t = bestTrip(r, value, keep);
    if (t && t.score > 0) return startTrip(r, t.hex.id, t.days, keep);
  }
  // Nothing needed right now: stock up on food while the pod builds.
  const t = bestTrip(r, (g) => g.food, ["food", "wood", "scrap", "stone"]);
  if (t && r.stock.food < 20) return startTrip(r, t.hex.id, t.days, ["food", "wood", "scrap", "stone"]);
  return rest(r, 1);
}

export function demoHexes(seed: number) {
  const ring1 = Array.from({ length: 6 }, (_, i) => `r1-${i}`);
  const ring2 = Array.from({ length: T.hexes.ring2Count }, (_, i) => `r2-${i}`);
  return generateHexes(seed, { ring1, ring2, city: "city" });
}

export function playGreedy(seed: number, maxSteps = 5000): Run {
  let run = newRun(seed, demoHexes(seed));
  for (let i = 0; i < maxSteps && run.status === "playing"; i++) run = greedyStep(run);
  return run;
}
