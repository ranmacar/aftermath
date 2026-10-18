/**
 * Demo loop (v1, tuned v1.2 by default): forage → haul → feed the pod gates, event to event. Pure functions over plain data;
 * every number comes from tuning.ts. Spec: docs/design/demo-loop-v1.md.
 */
import { TUNING as T } from "./tuning.ts";

export const RESOURCES = ["food", "wood", "stone", "scrap"] as const;
export type Res = (typeof RESOURCES)[number];
export type Stock = Record<Res, number>;
export type HexType = "forest" | "field" | "water" | "ruin" | "city";
export type Hex = { id: string; ring: number; type: HexType; mult: number; foragedAt: number | null };
export type StageId = "solar" | "dig" | "floor1" | "floor2" | "floor3" | "floor4";
export type StageStatus = "locked" | "open" | "building" | "done";
export type Stage = { id: StageId; cost: Stock; paid: Stock; status: StageStatus; buildDays: number; doneAt: number | null };
export type Storm = { start: number; end: number };
export type Activity =
  | { kind: "home" }
  | { kind: "rest"; until: number }
  | { kind: "work"; task: "help" | "shelter"; until: number }
  | { kind: "out-cold"; until: number }
  | { kind: "trip"; hexId: string; phase: "out" | "forage" | "back"; phaseEnd: number; forageDays: number; forageDone: number; load: Stock; keep: Res[] };
export type EventKind =
  | "trip-returned" | "bag-full" | "gate-built" | "floor-built" | "storm-warning" | "storm-start" | "storm-end"
  | "condition-low" | "food-out" | "collapse" | "work-done" | "rested" | "hazard" | "moved-in" | "soft-end" | "info"
  | "storm-choice";
export type LoopEvent = { day: number; kind: EventKind; text: string; stops: boolean };
export type Card = "dog-charging" | "cnc-soon" | "move-in" | "soft-end";
export type Run = {
  v: 1;
  seed: number;
  rng: number;
  day: number;
  stock: Stock;
  condition: number;
  hexes: Hex[];
  stages: Stage[];
  solarHelped: boolean;
  shelter: { paid: Stock; done: boolean };
  activity: Activity;
  storms: Storm[];
  scrapBoostUntil: number;
  foodPenaltyUntil: number;
  queuedDeliver: "gate" | "shelter" | null;
  /** Set when a storm warning reaches you mid-trip (rules.stormChoice): wait it out or turn back. */
  stormPrompt?: Storm | null;
  cards: Card[];
  stats: { collapses: number; stormsSurvived: number; scrapHauled: number; tripCount: number };
  status: "playing" | "moved-in" | "soft-end";
  log: LoopEvent[];
};

const EPS = 1e-6;
const zero = (): Stock => ({ food: 0, wood: 0, stone: 0, scrap: 0 });
const stock = (p: Partial<Stock>): Stock => ({ ...zero(), ...p });
const clone = <X>(x: X): X => structuredClone(x);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const weightOf = (s: Stock): number => RESOURCES.reduce((w, r) => w + s[r] * T.carry.weight[r], 0);

/** mulberry32 on an integer state; returns [value in 0..1, next state]. */
function rand(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}
function seededInts(seed: number, n: number): number[] {
  let s = seed | 0; const out: number[] = [];
  for (let i = 0; i < n; i++) { const [v, ns] = rand(s); s = ns; out.push(v); }
  return out;
}
const snap = (d: number) => Math.round(d / T.tick) * T.tick;

/** Storm schedule: start-to-start interval and duration drawn from the seed, whole days. */
export function stormSchedule(seed: number, until = T.end.softEndDay + 20): Storm[] {
  const r = seededInts(seed ^ 0x5eed, 200); let i = 0; const out: Storm[] = [];
  const pick = (a: number, b: number) => a + Math.floor(r[i++ % r.length]! * (b - a + 1));
  let start = pick(T.storms.intervalMin, T.storms.intervalMax);
  while (start < until) {
    const end = start + pick(T.storms.durationMin, T.storms.durationMax);
    out.push({ start, end });
    start += pick(T.storms.intervalMin, T.storms.intervalMax);
  }
  return out;
}

/**
 * Hex typing from a seed. ring1: the 6 neighbours (guaranteed forest, field, ruin); ring2: second ring;
 * city: the nearest built-up hex, placed at ring 3. Pass known types (e.g. from OSM landuse) to override.
 */
export function generateHexes(seed: number, ids: { ring1: string[]; ring2: string[]; city: string }, known: Partial<Record<string, HexType>> = {}): Hex[] {
  const r = seededInts(seed ^ 0xbeef, 64); let i = 0;
  const pool: HexType[] = ["forest", "field", "water", "ruin", "forest", "field"];
  const pick = () => pool[Math.floor(r[i++]! * pool.length)]!;
  const ring1: HexType[] = ids.ring1.map((id) => known[id] ?? pick());
  for (const need of ["forest", "field", "ruin"] as const) {
    if (ring1.includes(need)) continue;
    // replace a duplicate, never a known (OSM) type
    const counts = (t: HexType) => ring1.filter((x) => x === t).length;
    const j = ring1.findIndex((t, k) => known[ids.ring1[k]!] === undefined && counts(t) > 1);
    ring1[j >= 0 ? j : ring1.findIndex((_, k) => known[ids.ring1[k]!] === undefined)] = need;
  }
  const hex = (id: string, ring: number, type: HexType): Hex => ({ id, ring, type, mult: 1, foragedAt: null });
  return [
    ...ids.ring1.map((id, k) => hex(id, 1, ring1[k]!)),
    ...ids.ring2.map((id) => hex(id, 2, known[id] ?? pick())),
    hex(ids.city, T.cityRing, "city"),
  ];
}

const STAGE_ORDER: StageId[] = ["solar", "dig", "floor1", "floor2", "floor3", "floor4"];
function makeStages(): Stage[] {
  const g = T.gates;
  return STAGE_ORDER.map((id) => {
    const c = id === "solar" ? stock({ scrap: g.solar.scrap }) : id === "dig" ? stock({ scrap: g.dig.scrap, wood: g.dig.wood }) : stock({ scrap: g.floor.scrap, stone: g.floor.stone });
    const buildDays = id === "solar" ? g.solar.buildDays : id === "dig" ? g.dig.buildDays : g.floor.buildDays;
    return { id, cost: c, paid: zero(), status: id === "solar" ? "open" : "locked", buildDays, doneAt: null };
  });
}

export function newRun(seed: number, hexes: Hex[]): Run {
  return {
    v: 1, seed, rng: seed | 0, day: 0,
    stock: stock({ food: T.start.food, wood: T.start.wood, stone: T.start.stone, scrap: T.start.scrap }),
    condition: T.start.condition, hexes: clone(hexes), stages: makeStages(), solarHelped: false,
    shelter: { paid: zero(), done: false }, activity: { kind: "home" }, storms: stormSchedule(seed),
    scrapBoostUntil: -1, foodPenaltyUntil: -1, queuedDeliver: null, stormPrompt: null, cards: [],
    stats: { collapses: 0, stormsSurvived: 0, scrapHauled: 0, tripCount: 0 }, status: "playing", log: [],
  };
}

// ---------- queries ----------
export const STAGE_LABEL: Record<StageId, string> = { solar: "G1 Solar", dig: "G2 Dig", floor1: "Floor 1", floor2: "Floor 2", floor3: "Floor 3", floor4: "Floor 4" };
export const stormAt = (run: Run, t: number): Storm | undefined => run.storms.find((s) => s.start <= t + EPS && t < s.end - EPS);
export const nextStorm = (run: Run, t = run.day): Storm | undefined => run.storms.find((s) => s.start > t + EPS);
export const forecast = (run: Run): Storm | undefined => { const s = nextStorm(run); return s && s.start - run.day <= T.storms.warningDays + EPS ? s : undefined; };
export const hexById = (run: Run, id: string) => run.hexes.find((h) => h.id === id);
export const atHome = (run: Run) => run.activity.kind === "home";
export const floorsDone = (run: Run) => run.stages.filter((s) => s.id.startsWith("floor") && s.status === "done").length;
export const isDone = (run: Run, id: StageId) => run.stages.find((s) => s.id === id)!.status === "done";
export const owed = (st: Stage): Stock => { const o = zero(); for (const r of RESOURCES) o[r] = Math.max(0, st.cost[r] - st.paid[r]); return o; };
export const shelterOwed = (run: Run): Stock => { const o = zero(); o.wood = Math.max(0, T.shelter.wood - run.shelter.paid.wood); o.stone = Math.max(0, T.shelter.stone - run.shelter.paid.stone); return o; };
export const isPaid = (o: Stock) => RESOURCES.every((r) => o[r] <= EPS);
export const openStages = (run: Run) => run.stages.filter((s) => s.status === "open" || (s.status === "locked" && false));
/** What the pod still needs before it can continue (open gates, unpaid parts). */
export function podNeeds(run: Run): Stock {
  const n = zero();
  for (const s of run.stages) if (s.status === "open") { const o = owed(s); for (const r of RESOURCES) n[r] += o[r]; }
  return n;
}
/** Yield for one forage day on a hex right now, before the carry cap. */
export function dayYield(run: Run, hex: Hex, t = run.day): Stock {
  const base = T.yields[hex.type] as Partial<Stock>;
  const y = zero();
  for (const r of RESOURCES) {
    let v = (base[r] ?? 0) * hex.mult;
    if (r === "scrap" && (hex.type === "ruin" || hex.type === "city") && t < run.scrapBoostUntil) v *= 1 + T.afterStorm.scrapBonus;
    if (r === "food" && t < run.foodPenaltyUntil) v *= 1 + T.afterStorm.foodPenalty;
    y[r] = Math.round(v);
  }
  return y;
}
export const travelDays = (hex: Hex) => hex.ring * T.travelPerRing;
/** Rough preview for the trip picker (ignores depletion within the trip and hazards). */
export function tripPreview(run: Run, hexId: string, days: number) {
  const hex = hexById(run, hexId)!; const y = dayYield(run, hex);
  const total = travelDays(hex) * 2 + days;
  const end = run.day + total; const storm = run.storms.find((s) => s.start < end && s.end > run.day);
  return { perDay: y, totalDays: total, returnDay: end, foodNeeded: Math.ceil(total * T.condition.eatPerDay), stormOverlap: storm ?? null };
}

// ---------- actions (only at home unless noted) ----------
function push(run: Run, kind: EventKind, text: string, stops = true): LoopEvent { const e = { day: run.day, kind, text, stops }; run.log.push(e); if (run.log.length > 200) run.log.shift(); return e; }

export function startTrip(prev: Run, hexId: string, days: number, keep: Res[] = ["scrap", "stone", "wood", "food"]): Run {
  const run = clone(prev); const hex = hexById(run, hexId);
  if (!hex || !atHome(run) || run.status !== "playing" || stormAt(run, run.day) || days < 1) return prev;
  run.activity = { kind: "trip", hexId, phase: "out", phaseEnd: run.day + travelDays(hex), forageDays: Math.floor(days), forageDone: 0, load: zero(), keep };
  run.stats.tripCount++; push(run, "info", `Set out for the ${hex.type} (${days} day${days > 1 ? "s" : ""}).`, false);
  return run;
}
export function turnBack(prev: Run): Run {
  const run = clone(prev); const a = run.activity; if (a.kind !== "trip" || a.phase === "back") return prev;
  const hex = hexById(run, a.hexId)!;
  const outLeft = a.phase === "out" ? a.phaseEnd - run.day : 0;
  a.phaseEnd = run.day + (a.phase === "out" ? travelDays(hex) - outLeft : travelDays(hex));
  a.phase = "back"; run.stormPrompt = null; push(run, "info", "Turned back for home.", false); return run;
}
function payInto(run: Run, paid: Stock, need: Stock): Stock {
  const moved = zero();
  for (const r of RESOURCES) { const m = Math.min(run.stock[r], need[r]); run.stock[r] -= m; paid[r] += m; moved[r] = m; }
  return moved;
}
const fmt = (s: Stock) => RESOURCES.filter((r) => s[r] > 0).map((r) => `${s[r]} ${r}`).join(", ");
/** Deliver from the stockpile to the open pod gates (in order) or to the shelter. Works while away if queued. */
export function deliver(prev: Run, target: "gate" | "shelter"): Run {
  const run = clone(prev);
  if (!atHome(run) && run.activity.kind !== "rest") { run.queuedDeliver = target; return run; }
  let moved = zero();
  if (target === "gate") {
    for (const s of run.stages) if (s.status === "open") { const m = payInto(run, s.paid, owed(s)); for (const r of RESOURCES) moved[r] += m[r]; }
  } else if (isDone(run, "solar") && !run.shelter.done) moved = payInto(run, run.shelter.paid, shelterOwed(run));
  if (weightOf(moved) > 0) push(run, "info", `Delivered ${fmt(moved)} to the ${target === "gate" ? "pod" : "shelter"}.`, false);
  tryStartBuilds(run);
  return run;
}
/** Answer the mid-trip storm warning: keep going and sit the storm out where you are, or head home now. */
export function chooseStorm(prev: Run, choice: "wait" | "back"): Run {
  if (!prev.stormPrompt) return prev;
  let run = clone(prev); run.stormPrompt = null;
  if (choice === "back" && run.activity.kind === "trip" && run.activity.phase !== "back") run = turnBack(run);
  else push(run, "info", "You'll wait the storm out.", false);
  return run;
}
/** Condition you'd have when the coming storm ends if you wait it out (storm cost, plus hunger if food runs short). */
export function stormOutlook(run: Run, s: Storm): number {
  const a = run.activity; const C = T.condition;
  const food = run.stock.food + (a.kind === "trip" ? a.load.food : 0);
  const days = s.end - run.day; const hungryDays = Math.max(0, Math.ceil(days - food / C.eatPerDay));
  return run.condition + C.stormOutdoorsPerDay * (s.end - s.start) + C.hungryPerDay * hungryDays;
}
export function queueDeliver(prev: Run, target: "gate" | "shelter" | null): Run { const run = clone(prev); run.queuedDeliver = target; return run; }
export function canHelp(run: Run) { return atHome(run) && !run.solarHelped && run.stages[0]!.status === "open"; }
export function helpUnfold(prev: Run): Run {
  if (!canHelp(prev)) return prev; const run = clone(prev);
  run.activity = { kind: "work", task: "help", until: run.day + T.gates.solar.helpDays }; return run;
}
export function canWorkShelter(run: Run) { return atHome(run) && isDone(run, "solar") && !run.shelter.done && isPaid(shelterOwed(run)); }
export function workShelter(prev: Run): Run {
  if (!canWorkShelter(prev)) return prev; const run = clone(prev);
  run.activity = { kind: "work", task: "shelter", until: run.day + T.shelter.workDays }; return run;
}
export function rest(prev: Run, days = 1): Run {
  if (!atHome(prev)) return prev; const run = clone(prev); run.activity = { kind: "rest", until: run.day + days }; return run;
}
export function dismissCard(prev: Run, card: Card): Run { const run = clone(prev); run.cards = run.cards.filter((c) => c !== card); return run; }

// ---------- clock ----------
function tryStartBuilds(run: Run): void {
  for (let i = 0; i < run.stages.length; i++) {
    const s = run.stages[i]!; const prevStage = run.stages[i - 1];
    if (s.status !== "open" || !isPaid(owed(s))) continue;
    if (s.id === "solar" && !run.solarHelped) continue;
    if (prevStage && prevStage.status !== "done") continue;
    s.status = "building"; s.doneAt = run.day + s.buildDays;
    push(run, "info", `${STAGE_LABEL[s.id]}: building, ready on day ${fmtDay(s.doneAt)}.`, false);
    const next = run.stages[i + 1];
    // pay one ahead: v1 floors only; v1.2 every gate (G2 while G1 builds, Floor 1 while G2 builds, ...)
    if (next && next.status === "locked" && (T.rules.payAheadAll || (next.id.startsWith("floor") && s.id.startsWith("floor")))) next.status = "open";
  }
}
export const fmtDay = (d: number) => (Number.isInteger(d) ? String(d) : d.toFixed(1));

function addLoad(a: Extract<Activity, { kind: "trip" }>, y: Stock): boolean {
  let full = false;
  for (const r of a.keep) {
    const w = T.carry.weight[r]; const room = Math.floor((T.carry.capacity - weightOf(a.load) + EPS) / w);
    const take = Math.min(y[r], Math.max(0, room)); a.load[r] += take; if (take < y[r]) full = true;
  }
  return full || weightOf(a.load) >= T.carry.capacity - EPS;
}
function arriveHome(run: Run, load: Stock): void {
  for (const r of RESOURCES) run.stock[r] += load[r];
  run.stats.scrapHauled += load.scrap; run.activity = { kind: "home" };
}

function collapse(run: Run, events: LoopEvent[]): void {
  const a = run.activity; run.stats.collapses++;
  run.stormPrompt = null;
  if (a.kind === "trip") { const kept = zero(); for (const r of RESOURCES) kept[r] = Math.floor(a.load[r] * T.collapse.loadKept); arriveHome(run, kept); }
  run.activity = { kind: "out-cold", until: run.day + T.collapse.daysLost };
  run.condition = T.collapse.wakeCondition;
  run.stock.food += T.collapse.wakeFood;
  events.push(push(run, "collapse", `You collapsed. Lost ${T.collapse.daysLost} days and half the load; you wake at home.`));
}

/** One tick of simulated time. Returns events raised in it. */
export function tick(run: Run): LoopEvent[] {
  const ev: LoopEvent[] = []; const dt = T.tick; const t0 = run.day; const t1 = snap(t0 + dt);
  const storm = stormAt(run, t0); const a = run.activity; const C = T.condition;
  const condBefore = run.condition;
  // condition
  if (a.kind === "trip") { if (storm) run.condition += C.stormOutdoorsPerDay * dt; }
  else if (a.kind !== "out-cold") {
    if (storm) run.condition += (run.shelter.done ? C.stormShelterPerDay : C.stormLeanToPerDay) * dt;
    else if (a.kind === "home" || a.kind === "rest") run.condition += C.restAtHomePerDay * dt;
  }
  // trip
  let foragedHex: string | null = null;
  if (a.kind === "trip") {
    const hex = hexById(run, a.hexId)!;
    if (a.phase === "forage") {
      if (!storm) {
        a.forageDone += dt; foragedHex = hex.id;
        if (Math.abs(a.forageDone - Math.round(a.forageDone)) < EPS) {
          const full = addLoad(a, dayYield(run, hex, t0));
          hex.mult = Math.max(T.depletion.floor, hex.mult - T.depletion.perForageDay); hex.foragedAt = t1;
          if (hex.type === "city") { const [v, ns] = rand(run.rng); run.rng = ns; if (v < T.cityHazard.chancePerDay) { run.condition += T.cityHazard.condition; ev.push(push(run, "hazard", "Collapsed stairwell in the city edge. You climb out bruised.", false)); } }
          if (a.forageDone + EPS >= a.forageDays || full) {
            if (full && a.forageDone + EPS < a.forageDays) ev.push(push(run, "bag-full", "Bag full, heading home.", false));
            a.phase = "back"; a.phaseEnd = t1 + travelDays(hex);
          }
        }
      }
    } else if (t1 + EPS >= a.phaseEnd) {
      if (a.phase === "out") { a.phase = "forage"; a.phaseEnd = Infinity; }
      else { run.day = t1; const load = a.load; arriveHome(run, load); ev.push(push(run, "trip-returned", `Home with ${fmt(load) || "nothing"}.`)); }
    }
  }
  // regrowth
  for (const h of run.hexes) if (h.id !== foragedHex) h.mult = Math.min(1, h.mult + T.depletion.regrowPerDay * dt);
  run.day = t1;
  // work / rest / out-cold
  const b = run.activity;
  if ((b.kind === "work" || b.kind === "rest" || b.kind === "out-cold") && t1 + EPS >= b.until) {
    run.activity = { kind: "home" };
    if (b.kind === "work" && b.task === "help") { run.solarHelped = true; ev.push(push(run, "work-done", "Solar array unfolded.")); }
    if (b.kind === "work" && b.task === "shelter") { run.shelter.done = true; run.cards.push("cnc-soon"); ev.push(push(run, "work-done", "Rough shelter done. The container digs itself out: a first underground floor.")); }
    if (b.kind === "rest") ev.push(push(run, "rested", "Rested."));
    if (b.kind === "out-cold") ev.push(push(run, "info", "You come round at home.", false));
  }
  // food at each whole day
  if (Math.abs(t1 - Math.round(t1)) < EPS && run.activity.kind !== "out-cold") {
    const trip = run.activity.kind === "trip" ? run.activity : null;
    // Provisions come from the stockpile (packed when you leave); out there you eat from the bag after that.
    if (run.stock.food >= C.eatPerDay) { run.stock.food -= C.eatPerDay; if (run.stock.food < C.eatPerDay) ev.push(push(run, "food-out", "No food left in the stockpile.")); }
    else if (trip && trip.load.food >= C.eatPerDay) trip.load.food -= C.eatPerDay;
    else run.condition += C.hungryPerDay;
  }
  run.condition = clamp(run.condition, 0, C.max);
  if ((run.activity.kind === "home" || run.activity.kind === "rest") && condBefore < C.max && run.condition >= C.max && !storm) ev.push(push(run, "rested", "Fully rested."));
  // pod
  for (const s of run.stages) if (s.status === "building" && s.doneAt !== null && t1 + EPS >= s.doneAt) {
    s.status = "done";
    if (s.id === "solar") { run.cards.push("dog-charging"); ev.push(push(run, "gate-built", "Solar is up. Power on.")); }
    else if (s.id === "dig") ev.push(push(run, "gate-built", "The pit is dug and shored."));
    else ev.push(push(run, "floor-built", `${STAGE_LABEL[s.id]} is built.`));
    const i = run.stages.indexOf(s); const next = run.stages[i + 1];
    if (next && next.status === "locked") next.status = "open";
  }
  tryStartBuilds(run);
  // storms
  for (const s of run.storms) {
    if (t0 < s.start - T.storms.warningDays - EPS && t1 + EPS >= s.start - T.storms.warningDays) {
      const a2 = run.activity; const len = s.end - s.start;
      if (T.rules.stormChoice && a2.kind === "trip" && a2.phase !== "back") {
        run.stormPrompt = { ...s };
        ev.push(push(run, "storm-choice", `The pod warns: storm in ${T.storms.warningDays} day, lasting ${len}. Wait it out (${String(T.condition.stormOutdoorsPerDay).replace("-", "−")} Condition a day) or turn back?`));
      } else ev.push(push(run, "storm-warning", `The pod warns: storm in ${T.storms.warningDays} day, lasting ${len}.`));
    }
    if (t0 < s.start - EPS && t1 + EPS >= s.start) ev.push(push(run, "storm-start", "Storm. Outdoor foraging stops."));
    if (t0 < s.end - EPS && t1 + EPS >= s.end) {
      run.stats.stormsSurvived++; run.scrapBoostUntil = s.end + T.afterStorm.scrapDays; run.foodPenaltyUntil = s.end + T.afterStorm.foodDays;
      ev.push(push(run, "storm-end", "The storm passes. Debris is exposed in the ruins and the city: more scrap for a few days."));
    }
  }
  if (condBefore > C.lowWarning && run.condition <= C.lowWarning && run.condition > 0) ev.push(push(run, "condition-low", "Condition is low. Rest or eat."));
  if (run.condition <= EPS && run.activity.kind !== "out-cold") collapse(run, ev);
  // queued delivery fires when home
  if (atHome(run) && run.queuedDeliver) { const q = run.queuedDeliver; run.queuedDeliver = null; Object.assign(run, deliver(run, q)); }
  // end
  if (floorsDone(run) >= T.gates.floor.count && run.status === "playing") { run.status = "moved-in"; run.cards.push("move-in"); ev.push(push(run, "moved-in", "All four floors are built. Time to move in.")); }
  else if (run.day >= T.end.softEndDay && run.status === "playing") { run.status = "soft-end"; run.cards.push("soft-end"); ev.push(push(run, "soft-end", "The pod finished without you.")); }
  return ev;
}

/** Advance to the next event that needs a decision. At home with nothing queued, you rest. */
export function advance(prev: Run, maxDays = 30): { run: Run; events: LoopEvent[] } {
  const run = clone(prev); const events: LoopEvent[] = []; const limit = run.day + maxDays;
  if (run.status !== "playing") return { run: prev, events };
  // An unanswered storm prompt defaults to waiting it out (the UI always asks first).
  if (run.stormPrompt) { run.stormPrompt = null; push(run, "info", "You'll wait the storm out.", false); }
  while (run.day < limit - EPS && run.status === "playing") {
    const ev = tick(run); events.push(...ev);
    if (ev.some((e) => e.stops)) break;
  }
  return { run, events };
}

export function recap(run: Run) {
  return { days: run.day, par: T.end.parDays, collapses: run.stats.collapses, storms: run.stats.stormsSurvived, scrap: run.stats.scrapHauled, trips: run.stats.tripCount, floors: floorsDone(run), status: run.status };
}
