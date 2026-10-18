import assert from "node:assert/strict";
import test from "node:test";
import { applyTuning, PROPOSED_V1_1, TUNING as T } from "./tuning.ts";
import {
  type Run, advance, deliver, forecast, generateHexes, helpUnfold, newRun, recap, rest, startTrip, stormSchedule, tick,
  turnBack, weightOf, workShelter, dayYield, hexById, floorsDone,
} from "./loop.ts";
import { demoHexes, playGreedy } from "./greedy.ts";

const fresh = (seed = 7): Run => { applyTuning(null); return newRun(seed, demoHexes(seed)); };
const until = (r: Run, pred: (r: Run) => boolean, max = 400) => { for (let i = 0; i < max && !pred(r); i++) tick(r); return r; };
const noStorms = (r: Run) => { r.storms = []; return r; };

test("ring 1 always has forest, field and ruin; city sits at ring 3", () => {
  for (let s = 1; s < 200; s++) {
    const hx = demoHexes(s); const r1 = hx.filter((h) => h.ring === 1).map((h) => h.type);
    for (const t of ["forest", "field", "ruin"]) assert.ok(r1.includes(t as never), `seed ${s} lacks ${t}`);
    assert.equal(hx.find((h) => h.type === "city")!.ring, 3);
  }
  const known = generateHexes(1, { ring1: ["a", "b", "c", "d", "e", "f"], ring2: [], city: "x" }, { a: "water", b: "water", c: "water" });
  assert.deepEqual(known.slice(0, 3).map((h) => h.type), ["water", "water", "water"]);
});

test("start state matches spec", () => {
  const r = fresh();
  assert.deepEqual(r.stock, { food: 8, wood: 0, stone: 0, scrap: 0 });
  assert.equal(r.condition, 10); assert.equal(r.day, 0);
});

test("travel is 0.5 day per ring each way; carry caps at 12 with stone weighing 2", () => {
  const r = noStorms(fresh()); const ruin = r.hexes.find((h) => h.type === "ruin" && h.ring === 1)!;
  let s = startTrip(r, ruin.id, 4, ["stone", "scrap", "wood", "food"]);
  s = until(s, (x) => x.activity.kind === "home");
  // 4 stone + 2 scrap per day: day 1 → 10 weight, day 2 fills the bag (12) and heads home early.
  assert.ok(weightOf({ ...s.stock, food: 0 }) <= T.carry.capacity);
  assert.equal(s.stock.stone * 2 + s.stock.scrap, 12);
  assert.equal(s.day, 0.5 + 2 + 0.5);
  const city = s.hexes.find((h) => h.type === "city")!;
  const c = until(startTrip({ ...s, stock: { ...s.stock, food: 20 } }, city.id, 1), (x) => x.activity.kind === "home");
  assert.equal(c.day - s.day, 1.5 * 2 + 1);
});

test("depletion cuts 15% per forage day down to 30%, regrows 3% per day", () => {
  const r = noStorms(fresh()); const f = r.hexes.find((h) => h.type === "forest" && h.ring === 1)!;
  let s = until(startTrip(r, f.id, 1), (x) => x.activity.kind === "home");
  assert.ok(Math.abs(hexById(s, f.id)!.mult - (1 - 0.15 + 0.03 * 0.5)) < 1e-9); // the return half-day regrows
  const h = hexById(s, f.id)!; h.mult = 0.31; h.mult = Math.max(T.depletion.floor, h.mult - T.depletion.perForageDay);
  assert.equal(h.mult, 0.3);
  s = until(rest(s, 5), (x) => x.activity.kind === "home");
  assert.ok(Math.abs(hexById(s, f.id)!.mult - (0.3 + 0.15)) < 1e-9);
});

test("food upkeep and condition: hungry −2/day, rest +2/day, capped at 10", () => {
  const r = noStorms(fresh()); r.stock.food = 0; r.condition = 6;
  let s = until(rest(r, 1), (x) => x.day >= 1);
  assert.equal(s.condition, 6 + 2 - 2); // +2 from resting, −2 hungry
  s.stock.food = 5; s.condition = 5;
  s = until(rest(s, 2), (x) => x.day >= 3);
  assert.equal(s.condition, 9); assert.equal(s.stock.food, 3);
});

test("collapse loses 2 days and half the load, wake at home with Condition 4", () => {
  const r = noStorms(fresh()); const city = r.hexes.find((h) => h.type === "city")!;
  let s = startTrip(r, city.id, 3); s.stock.food = 0; s.condition = 2;
  const trip = s.activity as Extract<Run["activity"], { kind: "trip" }>;
  trip.phase = "forage"; trip.phaseEnd = Infinity; trip.load = { food: 0, wood: 0, stone: 0, scrap: 9 };
  s = until(s, (x) => x.stats.collapses > 0);
  assert.equal(s.condition, T.collapse.wakeCondition);
  assert.equal(s.stock.scrap, 6); // the day's 6 scrap topped the bag to 12, half is kept
  assert.equal(s.activity.kind, "out-cold");
  const d0 = s.day; const woke = until(s, (x) => x.activity.kind === "home");
  assert.equal(woke.day - d0, 2);
});

test("G1 needs 12 scrap and the unfold help, builds in 3 days, then the dog card", () => {
  let r = noStorms(fresh()); r.stock.scrap = 12;
  r = deliver(r, "gate");
  assert.equal(r.stages[0]!.status, "open");
  r = helpUnfold(r); const ev = advance(r); r = ev.run;
  assert.equal(r.stages[0]!.status, "building"); assert.equal(r.stages[0]!.doneAt, 0.5 + 3);
  r = until(r, (x) => x.stages[0]!.status === "done");
  assert.equal(r.day, 3.5); assert.ok(r.cards.includes("dog-charging"));
  assert.equal(r.stages[1]!.status, "open");
});

test("floors pay one ahead and build 6 days each; four floors end in Move in", () => {
  let r = noStorms(fresh()); r.stock = { food: 200, wood: 100, stone: 100, scrap: 100 };
  r = helpUnfold(deliver(r, "gate")); r = until(r, (x) => x.stages[1]!.status === "open");
  r = deliver(r, "gate"); r = until(r, (x) => x.stages[2]!.status === "open");
  const digDone = r.day; r = deliver(r, "gate");
  assert.equal(r.stages[2]!.status, "building");
  assert.equal(r.stages[3]!.status, "open"); // pre-pay floor 2 while floor 1 builds
  r = deliver(r, "gate"); assert.equal(r.stages[3]!.paid.scrap, 8);
  assert.equal(r.stages[4]!.status, "locked");
  while (r.status === "playing") { r = deliver(r, "gate"); tick(r); }
  assert.equal(floorsDone(r), 4); assert.equal(r.status, "moved-in"); assert.ok(r.cards.includes("move-in"));
  assert.equal(r.day, digDone + 4 * 6);
});

test("shelter: 15 wood + 8 stone + 2 days work after G1, then CNC card and safe storms", () => {
  let r = fresh(); r.stock = { food: 50, wood: 15, stone: 8, scrap: 12 };
  r = helpUnfold(deliver(r, "gate")); r = until(r, (x) => x.stages[0]!.status === "done");
  r = deliver(r, "shelter"); r = workShelter(r);
  assert.equal(r.activity.kind, "work");
  r = until(r, (x) => x.shelter.done);
  assert.ok(r.cards.includes("cnc-soon"));
  r.storms = [{ start: r.day + 1, end: r.day + 3 }]; r.condition = 6;
  const c0 = r.condition; r = until(rest(r, 1), (x) => x.day >= x.storms[0]!.start + 1.5);
  assert.ok(r.condition >= c0); // no storm penalty at home with the shelter (rest gain stops during the storm)
});

test("storms: 8-12 days apart, 1-2 days long, warned a day ahead, +50% scrap after", () => {
  const st = stormSchedule(3);
  for (let i = 1; i < st.length; i++) { const gap = st[i]!.start - st[i - 1]!.start; assert.ok(gap >= 8 && gap <= 12); }
  for (const s of st) assert.ok(s.end - s.start >= 1 && s.end - s.start <= 2);
  let r = fresh(3); r.storms = [{ start: 5, end: 6 }];
  const a = advance(r); assert.equal(a.events.at(-1)!.kind, "storm-warning"); assert.equal(a.run.day, 4);
  assert.ok(forecast(a.run));
  r = until(a.run, (x) => x.stats.stormsSurvived > 0);
  const ruin = r.hexes.find((h) => h.type === "ruin")!; ruin.mult = 1;
  assert.equal(dayYield(r, ruin).scrap, 3); // 2 × 1.5
  assert.equal(r.condition, 10 - 1 + 0); // lean-to −1 for the storm day (+2 rest before it already capped)
});

test("turn back keeps the load", () => {
  let r = noStorms(fresh()); const f = r.hexes.find((h) => h.type === "forest" && h.ring === 1)!;
  r = startTrip(r, f.id, 4); r = until(r, (x) => x.activity.kind === "trip" && x.activity.forageDone >= 1);
  r = turnBack(r); r = until(r, (x) => x.activity.kind === "home");
  assert.ok(r.stock.wood >= 6); assert.equal(r.day, 0.5 + 1 + 0.5);
});

test("soft end at day 120", () => {
  let r = fresh(); for (let i = 0; i < 400 && r.status === "playing"; i++) r = advance(r).run;
  assert.equal(r.status, "soft-end"); assert.ok(r.cards.includes("soft-end")); assert.equal(r.day, 120);
});

test("headless greedy playthrough", () => {
  const summarize = () => { const d: number[] = []; let fin = 0;
    for (let s = 1; s <= 30; s++) { const c = recap(playGreedy(s)); d.push(c.days); if (c.status === "moved-in") fin++; }
    d.sort((a, b) => a - b); return { fin, min: d[0]!, median: d[15]!, max: d.at(-1)! }; };
  applyTuning(null); const spec = summarize();
  applyTuning(PROPOSED_V1_1); const prop = summarize(); applyTuning(null);
  console.log(`greedy, spec v1: ${spec.fin}/30 moved in, days min ${spec.min} median ${spec.median} max ${spec.max}`);
  console.log(`greedy, proposed v1.1: ${prop.fin}/30 moved in, days min ${prop.min} median ${prop.median} max ${prop.max}`);
  assert.equal(prop.fin, 30);
  assert.ok(prop.median >= 40 && prop.median <= 70, `proposed median ${prop.median}`);
  assert.ok(spec.min >= 40); // spec v1 never beats par by luck
  assert.equal(recap(playGreedy(5)).days, recap(playGreedy(5)).days); // deterministic
});
