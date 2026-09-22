import assert from "node:assert/strict";
import test from "node:test";
import {
  canComplete,
  completeQuest,
  currentQuest,
  emptySettlement,
  parseSettlement,
  podHeight,
} from "./index.ts";

test("quests complete in order", () => {
  let s = emptySettlement("cell");
  assert.equal(currentQuest(s)?.id, "solar");
  assert.equal(canComplete(s, "dig"), false);
  assert.equal(canComplete(s, "rise"), false);

  s = completeQuest(s, "dig");
  assert.equal(s.power, 0);
  assert.equal(currentQuest(s)?.id, "solar");

  s = completeQuest(s, "solar");
  assert.equal(s.power, 1);
  assert.equal(currentQuest(s)?.id, "dig");

  s = completeQuest(s, "dig");
  assert.equal(s.water, 1);
  assert.equal(s.materials, 1);
  assert.equal(currentQuest(s)?.id, "rise");

  s = completeQuest(s, "rise");
  assert.equal(s.floors, 1);
  assert.equal(s.materials, 0);
  assert.equal(currentQuest(s), null);
  assert.equal(podHeight(3.2, s), 6);
});

test("parseSettlement fills defaults", () => {
  const s = parseSettlement({ completed: ["solar"], power: 1 }, "abc");
  assert.equal(s.cell, "abc");
  assert.equal(s.power, 1);
  assert.equal(currentQuest(s)?.id, "dig");
});

import {
  DEMO_YEAR_SCHEDULE,
  validateSchedule,
  workOnBed,
  AGRO_BED_COUNT,
} from "./schedule.ts";

test("demo schedule: one work per bed per day", () => {
  const errs = validateSchedule(DEMO_YEAR_SCHEDULE);
  assert.equal(errs.length, 0, errs.slice(0, 5).join("; "));
  for (let b = 0; b < AGRO_BED_COUNT; b++) {
    assert.ok(workOnBed(DEMO_YEAR_SCHEDULE, b, 1));
    assert.ok(workOnBed(DEMO_YEAR_SCHEDULE, b, 180));
    assert.ok(workOnBed(DEMO_YEAR_SCHEDULE, b, 365));
  }
});
