/**
 * Planner bot (Sid's v1.3 brief), alongside the greedy bot. Headless test player only, not used by the UI.
 * - Opens with a city run for G1's scrap.
 * - Always gathers for the next unpaid gate in build order, even while the pod is still building the one
 *   before it (pay ahead), with the shelter and later gates as a secondary goal.
 * - Larder under 4 food: a food run first.
 * - Checks the storm warning before setting out: it only takes trips that are home before a forecast
 *   storm, otherwise it rests through it.
 * - Keeps the greedy bot's mid-trip storm rule (turn back if Condition would end at bot.stormTurnBackAt or less).
 */
import { TUNING as T } from "./tuning.ts";
import {
  RESOURCES, type Hex, type Res, type Run, type Stock, advance, canHelp, canWorkShelter, chooseStorm, deliver, forecast,
  helpUnfold, isDone, newRun, owed, rest, shelterOwed, startTrip, stormAt, stormOutlook, travelDays, workShelter,
} from "./loop.ts";
import { demoHexes, haul } from "./greedy.ts";

const z = (): Stock => ({ food: 0, wood: 0, stone: 0, scrap: 0 });

/** [next gate still short after counting the stockpile, everything after it (gates + shelter)]. */
function goals(run: Run): [Stock, Stock] {
  const left = { ...run.stock }; const primary = z(), later = z(); let found = false;
  const take = (need: Stock, into: Stock) => { for (const r of RESOURCES) { const m = Math.min(left[r], need[r]); left[r] -= m; into[r] += need[r] - m; } };
  for (const s of run.stages) {
    if (s.status === "building" || s.status === "done") continue;
    const tmp = z(); take(owed(s), tmp);
    if (!found && RESOURCES.some((r) => tmp[r] > 0)) { for (const r of RESOURCES) primary[r] += tmp[r]; found = true; }
    else for (const r of RESOURCES) later[r] += tmp[r];
  }
  if (!run.shelter.done) { const tmp = z(); take(shelterOwed(run), tmp); for (const r of RESOURCES) later[r] += tmp[r]; }
  return [primary, later];
}

type Plan = { hex: Hex; days: number; keep: Res[]; score: number };
function plan(run: Run, value: (g: Stock) => number, keep: Res[], maxDays = 4): Plan | null {
  const fc = forecast(run); let best: Plan | null = null;
  for (const hex of run.hexes) for (let d = 1; d <= maxDays; d++) {
    const total = travelDays(hex) * 2 + d;
    if (fc && fc.start < run.day + total) continue; // storm warning: only trips that are home first
    if (run.stock.food < total * T.condition.eatPerDay && keep[0] !== "food") continue;
    const score = value(haul(run, hex, d, keep)) / total;
    if (!best || score > best.score + 1e-9) best = { hex, days: d, keep, score };
  }
  return best;
}
const go = (r: Run, p: Plan | null) => (p && p.score > 0 ? startTrip(r, p.hex.id, p.days, p.keep) : null);

export function plannerDecide(run: Run): Run {
  if (run.stormPrompt) return chooseStorm(run, stormOutlook(run, run.stormPrompt) <= T.bot.stormTurnBackAt ? "back" : "wait");
  if (run.activity.kind !== "home") return run;
  let r = deliver(deliver(run, "gate"), "shelter");
  if (canHelp(r)) return helpUnfold(r);
  if (canWorkShelter(r)) return workShelter(r);
  if (stormAt(r, r.day) || (r.condition <= 4 && r.stock.food > 0)) return rest(r, 1);

  // Opening: one city run covers G1's scrap.
  const city = r.hexes.find((h) => h.type === "city");
  if (!isDone(r, "solar") && r.stages[0]!.status === "open" && owed(r.stages[0]!).scrap > r.stock.scrap && city) {
    const p = plan({ ...r, hexes: [city] }, (g) => g.scrap, ["scrap", "food", "wood", "stone"], 2);
    const t = go(r, p); if (t) return t;
  }

  const fc = forecast(r);
  // Larder short: a food run first (ruins and the city feed you nothing).
  if (r.stock.food < 4) {
    const f = go(r, plan(r, (g) => g.food, ["food", "scrap", "wood", "stone"]));
    if (f) return f;
  }
  const [primary, later] = goals(r);
  const value = (g: Stock) => RESOURCES.reduce((v, x) => {
    const a = Math.min(g[x], primary[x]); const b = Math.min(g[x] - a, later[x]);
    return v + (a * 3 + b) * T.carry.weight[x];
  }, 0);
  const order = [...RESOURCES].filter((x) => x !== "food").sort((a, b) => (primary[b] * 3 + later[b]) - (primary[a] * 3 + later[a]));
  const keep: Res[] = [...order, "food"];
  const t = go(r, plan(r, value, keep));
  if (t) return t;
  if (fc) return rest(r, Math.max(1, fc.end - r.day)); // nothing fits before the storm: sit it out at home
  const f = go(r, plan(r, (g) => g.food, ["food", "wood", "scrap", "stone"]));
  if (f && r.stock.food < 20) return f;
  return rest(r, 1);
}

export function playPlanner(seed: number, maxSteps = 5000): Run {
  let run = newRun(seed, demoHexes(seed));
  for (let i = 0; i < maxSteps && run.status === "playing"; i++) run = advance(plannerDecide(run)).run;
  return run;
}
