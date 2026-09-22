export type QuestId = "solar" | "dig" | "rise";

export type QuestDef = {
  id: QuestId;
  title: string;
  hint: string;
  prompt: string;
};

export type Settlement = {
  cell: string;
  awakenedAt: number;
  power: number;
  water: number;
  materials: number;
  floors: number;
  completed: QuestId[];
};

export const QUEST_DEFS: readonly QuestDef[] = [
  {
    id: "solar",
    title: "Solar roof",
    hint: "Assemble the solar roof flat, then it pitches up.",
    prompt: "Hold to install solar",
  },
  {
    id: "dig",
    title: "Dig",
    hint: "Beside the container — excavate the tower footprint.",
    prompt: "Hold to dig",
  },
  {
    id: "rise",
    title: "Rise",
    hint: "Raise the roof and build the first floor ring.",
    prompt: "Hold to raise floor",
  },
];

const ORDER: readonly QuestId[] = QUEST_DEFS.map((q) => q.id);

function isQuestId(value: unknown): value is QuestId {
  return value === "solar" || value === "dig" || value === "rise";
}

export function emptySettlement(cell: string, now = Date.now()): Settlement {
  return {
    cell,
    awakenedAt: now,
    power: 0,
    water: 0,
    materials: 0,
    floors: 0,
    completed: [],
  };
}

export function parseSettlement(raw: unknown, cell: string): Settlement {
  const base = emptySettlement(cell);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const completed = Array.isArray(o.completed)
    ? o.completed.filter(isQuestId)
    : [];
  return {
    cell,
    awakenedAt: typeof o.awakenedAt === "number" ? o.awakenedAt : base.awakenedAt,
    power: typeof o.power === "number" ? o.power : completed.includes("solar") ? 1 : 0,
    water: typeof o.water === "number" ? o.water : completed.includes("dig") ? 1 : 0,
    materials:
      typeof o.materials === "number"
        ? o.materials
        : completed.includes("dig") && !completed.includes("rise")
          ? 1
          : 0,
    floors: typeof o.floors === "number" ? o.floors : completed.includes("rise") ? 1 : 0,
    completed,
  };
}

export function isDone(s: Settlement, id: QuestId): boolean {
  return s.completed.includes(id);
}

export function currentQuest(s: Settlement): QuestDef | null {
  const id = ORDER.find((q) => !isDone(s, q));
  return QUEST_DEFS.find((q) => q.id === id) ?? null;
}

export function canComplete(s: Settlement, id: QuestId): boolean {
  return currentQuest(s)?.id === id;
}

export function completeQuest(s: Settlement, id: QuestId): Settlement {
  if (!canComplete(s, id)) return s;
  const next: Settlement = {
    ...s,
    completed: [...s.completed, id],
  };
  if (id === "solar") next.power = 1;
  if (id === "dig") {
    next.water = 1;
    next.materials = 1;
  }
  if (id === "rise") {
    next.floors += 1;
    next.materials = Math.max(0, next.materials - 1);
  }
  return next;
}

export function questStatus(s: Settlement): { def: QuestDef; done: boolean }[] {
  return QUEST_DEFS.map((def) => ({ def, done: isDone(s, def.id) }));
}

export function podHeight(base: number, s: Settlement, floorH = 2.8): number {
  return base + s.floors * floorH;
}

export {
  CROPS,
  NUTRIENT_QUALITY_SCALE,
  getCrop,
  cropsByRole,
  draftCrops,
  reviewedCrops,
  edibleKgPerM2,
  residueKgPerM2,
} from "./crops.ts";
export type {
  Crop,
  CropId,
  CropKind,
  AgroRole,
  CropStatus,
  NutrientQuality,
} from "./crops.ts";

export {
  agroBedRefs,
  AGRO_BED_COUNT,
  DEMO_YEAR_SCHEDULE,
  dayOfYearFromDate,
  workOnBed,
  scheduleSnapshot,
  cropIdOf,
  validateSchedule,
  bedCropsAt,
  describeBedWork,
  isHarvesting,
} from "./schedule.ts";
export type {
  AgroBedRef,
  AgroRing,
  CultivationWork,
  BedScheduleEntry,
  SeasonSchedule,
} from "./schedule.ts";
