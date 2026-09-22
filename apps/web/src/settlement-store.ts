import {
  type QuestId,
  type Settlement,
  completeQuest,
  emptySettlement,
  parseSettlement,
} from "@aftermath/sim";

const PREFIX = "aftermath:settlement:v1:";

export function loadSettlement(cell: string): Settlement {
  try {
    const raw = localStorage.getItem(PREFIX + cell);
    if (!raw) return emptySettlement(cell);
    return parseSettlement(JSON.parse(raw) as unknown, cell);
  } catch {
    return emptySettlement(cell);
  }
}

export function saveSettlement(s: Settlement): void {
  localStorage.setItem(PREFIX + s.cell, JSON.stringify(s));
}

export function awaken(cell: string): Settlement {
  const existing = localStorage.getItem(PREFIX + cell);
  if (existing) return loadSettlement(cell);
  const s = emptySettlement(cell);
  saveSettlement(s);
  return s;
}

export function applyQuest(cell: string, id: QuestId): Settlement {
  const next = completeQuest(loadSettlement(cell), id);
  saveSettlement(next);
  return next;
}
