/**
 * Demo loop UI for the Build view: status strip, pod panel (bottom sheet on phones, side panel on
 * desktop), trip planner, event toasts and reward cards. Logic lives in @aftermath/sim/loop.
 */
import { gridDisk } from "h3-js";
import {
  type Card, type Hex, type Res, type Run,
  DEFAULT_TUNING, RESOURCES, STAGE_LABEL, TUNING, advance, atHome, chooseStorm, stormOutlook, tuningName, useTuning, canHelp, canWorkShelter, dayYield,
  deliver, dismissCard, fmtDay, forecast, generateHexes, helpUnfold, hexById, newRun, owed, queueDeliver, recap, rest,
  plural, TYPE_LABEL, shelterOwed, startTrip, stormAt, travelDays, tripPreview, turnBack, weightOf, workShelter,
} from "@aftermath/sim/loop";
import type { Settlement } from "@aftermath/sim";

const KEY = "aftermath:loop:v1:";
const RES_ICON: Record<Res, string> = { food: "🥕", wood: "🪵", stone: "🪨", scrap: "⚙️" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function seedOf(cell: string): number { let h = 2166136261; for (const ch of cell) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h | 0; }

export function loopHexes(cell: string): Hex[] {
  const d1 = gridDisk(cell, 1).filter((c) => c !== cell);
  const in1 = new Set([cell, ...d1]);
  const d2 = gridDisk(cell, 2).filter((c) => !in1.has(c)).slice(0, TUNING.hexes.ring2Count);
  const in2 = new Set([...in1, ...d2]);
  const city = gridDisk(cell, TUNING.cityRing).find((c) => !in2.has(c)) ?? cell;
  // OSM landuse typing is not wired yet: types come from the cell seed (spec §3 fallback).
  return generateHexes(seedOf(cell), { ring1: d1, ring2: d2, city });
}

/** Map loop progress onto the old settlement shape so Build's existing visuals follow the pod. */
export function loopToSettlement(run: Run, base: Settlement): Settlement {
  const done = (id: string) => run.stages.find((s) => s.id === id)?.status === "done";
  const floors = run.stages.filter((s) => s.id.startsWith("floor") && s.status === "done").length;
  const completed = (["solar", "dig", "rise"] as const).filter((q) => (q === "solar" ? done("solar") : q === "dig" ? done("dig") : floors > 0));
  return { ...base, power: done("solar") ? 1 : 0, water: done("dig") ? 1 : 0, materials: 0, floors, completed: [...completed] };
}

export type LoopUi = { dispose: () => void; run: () => Run };

export function mountLoop(root: HTMLElement, cell: string, opts: { onChange: (run: Run) => void; onFarm: () => void }): LoopUi {
  // ?tuning=v1 | v1.1 | v1.2 | v1.3 (default). Each tuning keeps its own save; v1 and v1.1 keep their old keys.
  const tuning = tuningName(new URLSearchParams(location.search).get("tuning"));
  useTuning(tuning);
  const storeKey = KEY + ({ "v1": "", "v1.1": "p:", "v1.2": "v12:", "v1.3": "v13:" } as const)[tuning] + cell;
  let run: Run = load() ?? newRun(seedOf(cell), loopHexes(cell));
  let sel: { hex: string | null; days: number; keep: Res } = { hex: null, days: 2, keep: "scrap" };
  let open = window.matchMedia("(min-width: 760px)").matches;

  const el = document.createElement("div");
  el.className = "loop"; el.innerHTML = `<div class="loop-top"><div class="loop-strip" role="status"></div><div class="loop-toasts" aria-live="polite"></div></div>
<section class="loop-panel" aria-label="Pod"></section><div class="loop-card" hidden></div>`;
  root.appendChild(el);
  const strip = el.querySelector<HTMLElement>(".loop-strip")!, panel = el.querySelector<HTMLElement>(".loop-panel")!;
  const toasts = el.querySelector<HTMLElement>(".loop-toasts")!, card = el.querySelector<HTMLElement>(".loop-card")!;
  for (const n of [strip, panel, card, toasts]) { n.addEventListener("pointerdown", (e) => e.stopPropagation()); n.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true }); }

  function load(): Run | null { try { const raw = localStorage.getItem(storeKey); const r = raw ? (JSON.parse(raw) as Run) : null; if (r) r.storms = r.storms.map((s) => ({ ...s })); return r && r.v === 1 ? r : null; } catch { return null; } }
  function save() { try { localStorage.setItem(storeKey, JSON.stringify(run, (_k, v) => (v === Infinity ? 1e9 : v))); } catch { /* quota */ } }
  function set(next: Run, events: { text: string; kind: string }[] = []) {
    run = next; save(); for (const e of events) toast(e.text, e.kind); render(); opts.onChange(run);
  }
  function toast(text: string, kind: string) {
    const t = document.createElement("p"); t.className = `loop-toast is-${kind}`; t.textContent = text; toasts.prepend(t);
    while (toasts.children.length > 3) toasts.lastElementChild!.remove();
    setTimeout(() => t.remove(), 5000);
  }

  const resLine = (s: Record<Res, number>, cls = "") => RESOURCES.map((r) => `<span class="res ${cls}" title="${r}">${RES_ICON[r]} ${Math.floor(s[r])}</span>`).join("");
  const costLine = (paid: Record<Res, number>, cost: Record<Res, number>) => RESOURCES.filter((r) => cost[r] > 0).map((r) => `${RES_ICON[r]} ${Math.floor(paid[r])}/${cost[r]}`).join(" · ");

  function activityText(): string {
    const a = run.activity;
    if (a.kind === "home") return "At home by the pod.";
    if (a.kind === "rest") return `Resting until day ${fmtDay(a.until)}.`;
    if (a.kind === "out-cold") return `Out cold until day ${fmtDay(a.until)}.`;
    if (a.kind === "work") return a.task === "help" ? `Unfolding the solar array (until day ${fmtDay(a.until)}).` : `Building the rough shelter (until day ${fmtDay(a.until)}).`;
    const hex = hexById(run, a.hexId)!; const what = TYPE_LABEL[hex.type].toLowerCase();
    if (a.phase === "out") return `Walking to the ${what}.`;
    if (a.phase === "back") return `Hauling home from the ${what}: ${weightOf(a.load)}/${TUNING.carry.capacity} load.`;
    return `Foraging the ${what}: day ${Math.min(a.forageDays, Math.floor(a.forageDone) + 1)} of ${a.forageDays}, ${weightOf(a.load)}/${TUNING.carry.capacity} load.`;
  }

  function renderStrip() {
    const fc = forecast(run), storm = stormAt(run, run.day);
    strip.innerHTML = `<span class="day">Day ${fmtDay(run.day)}</span><span class="cond ${run.condition <= TUNING.condition.lowWarning ? "is-low" : ""}" title="Condition">♥ ${Math.round(run.condition)}/10</span>${resLine(run.stock)}${storm ? `<span class="chip is-storm">Storm</span>` : fc ? `<span class="chip is-warn">Storm in ${fmtDay(fc.start - run.day)}d</span>` : ""}`;
  }

  function hexRow(h: Hex): string {
    const y = dayYield(run, h); const yl = RESOURCES.filter((r) => y[r] > 0).map((r) => `${RES_ICON[r]}${y[r]}`).join(" ");
    return `<button type="button" class="hex ${sel.hex === h.id ? "is-sel" : ""}" data-hex="${h.id}" aria-pressed="${sel.hex === h.id}">
<span class="hex-name">${TYPE_LABEL[h.type]}</span><span class="hex-ring">ring ${h.ring} · ${fmtDay(travelDays(h))}d each way</span>
<span class="hex-yield">${yl}/day</span><span class="hex-mult" style="--m:${h.mult}">${Math.round(h.mult * 100)}%</span></button>`;
  }

  function renderPanel() {
    if (run.status !== "playing") { panel.innerHTML = `<header class="loop-head"><h2>Pod</h2></header><p class="act">${run.status === "moved-in" ? "The tower is built." : "The pod finished without you."}</p><p><button type="button" class="btn ghost" data-act="reset">Start over</button></p>`; panel.classList.toggle("is-open", open); return; }
    const home = atHome(run), a = run.activity;
    const stages = run.stages.map((s, i) => `<li class="stage is-${s.status}"><span class="st-name">${STAGE_LABEL[s.id]}</span><span class="st-cost">${s.status === "done" ? "built" : s.status === "building" ? `building · ready day ${fmtDay(s.doneAt!)}` : s.status === "open" ? costLine(s.paid, s.cost) + (s.id === "solar" && !run.solarHelped ? " · needs unfolding" : "") + (i > 0 && run.stages[i - 1]!.status !== "done" ? " · deliver early" : "") : "locked"}</span></li>`).join("");
    const shelterRow = run.shelter.done ? `<li class="stage is-done"><span class="st-name">Shelter</span><span class="st-cost">built</span></li>`
      : `<li class="stage ${run.stages[0]!.status === "done" ? "is-open" : "is-locked"}"><span class="st-name">Shelter</span><span class="st-cost">${run.stages[0]!.status === "done" ? costLine(run.shelter.paid, { food: 0, wood: TUNING.shelter.wood, stone: TUNING.shelter.stone, scrap: 0 }) + ` · ${TUNING.shelter.workDays}d work` : "after the solar array"}</span></li>`;
    const gateNeed = run.stages.some((s) => s.status === "open" && RESOURCES.some((r) => owed(s)[r] > 0 && run.stock[r] > 0));
    const shelterNeed = !run.shelter.done && run.stages[0]!.status === "done" && RESOURCES.some((r) => shelterOwed(run)[r] > 0 && run.stock[r] > 0);
    const homeActs = home ? `<div class="acts">
${gateNeed ? `<button type="button" class="btn" data-act="deliver-gate">Deliver to pod</button>` : ""}
${shelterNeed ? `<button type="button" class="btn" data-act="deliver-shelter">Deliver to shelter</button>` : ""}
${canHelp(run) ? `<button type="button" class="btn" data-act="help">Unfold array (${fmtDay(TUNING.gates.solar.helpDays)}d)</button>` : ""}
${canWorkShelter(run) ? `<button type="button" class="btn" data-act="shelter">Build shelter (${TUNING.shelter.workDays}d)</button>` : ""}
<button type="button" class="btn ghost" data-act="rest">Rest a day</button></div>` : "";
    const awayActs = a.kind === "trip" ? `<div class="acts">${a.phase !== "back" ? `<button type="button" class="btn ghost" data-act="turnback">Turn back</button>` : ""}
<label class="queue"><input type="checkbox" data-act="queue" ${run.queuedDeliver ? "checked" : ""}> Deliver to pod on return</label></div>` : "";
    let planner = "";
    if (home && !stormAt(run, run.day)) {
      const hexes = [...run.hexes].sort((x, y) => x.ring - y.ring);
      const pv = sel.hex ? tripPreview(run, sel.hex, sel.days) : null;
      planner = `<h3>Forage</h3><div class="hexes">${hexes.map(hexRow).join("")}</div>
<div class="plan"><div class="days" role="group" aria-label="Days to stay"><button type="button" class="btn sq" data-act="days-" aria-label="Fewer days">−</button><span>${plural(sel.days, "day")}</span><button type="button" class="btn sq" data-act="days+" aria-label="More days">+</button></div>
<label class="keep">Carry first <select data-act="keep">${(["scrap", "stone", "wood", "food"] as Res[]).map((r) => `<option value="${r}" ${sel.keep === r ? "selected" : ""}>${r}</option>`).join("")}</select></label></div>
${pv ? `<p class="preview">Back on day ${fmtDay(pv.returnDay)} · eats ${Math.ceil(pv.totalDays * TUNING.condition.eatPerDay)} food${pv.stormOverlap ? ` · <strong class="warn">${pv.stormOverlap.start - run.day <= TUNING.storms.warningDays ? "storm forecast" : ""}</strong>` : ""}</p>` : `<p class="preview">Pick a hex.</p>`}
<button type="button" class="btn go" data-act="go" ${sel.hex ? "" : "disabled"}>Set out</button>`;
    }
    const log = run.log.slice(-5).reverse().map((e) => `<li><span>${fmtDay(e.day)}</span> ${esc(e.text)}</li>`).join("");
    panel.innerHTML = `<header class="loop-head"><button type="button" class="sheet-toggle" data-act="toggle" aria-expanded="${open}">${open ? "Hide" : "Pod"}</button><p class="act">${esc(activityText())}</p></header>
<button type="button" class="btn next" data-act="next">Next event ▶</button>
<div class="loop-body"><h3>Pod</h3><ul class="stages">${stages}${shelterRow}</ul>${homeActs}${awayActs}${planner}
<h3>Log</h3><ol class="log">${log}</ol><p class="small">${tuning !== DEFAULT_TUNING ? `Tuning: ${tuning} · ` : ""}<button type="button" class="link" data-act="reset">Start over</button></p></div>`;
    panel.classList.toggle("is-open", open);
  }

  const CARDS: Record<Card, () => string> = {
    "dog-charging": () => `<h2>Power on</h2><p>Solar is up. In the container a robot dog sits on its charger, its status light blinking amber: <em>charging…</em></p><p class="small">Coming after the demo: a helper that fetches, scouts and runs errands within its charge.</p>`,
    "cnc-soon": () => `<h2>A first underground floor</h2><p>With the shelter up, the container digs itself out. The space it leaves becomes the first underground floor, with a CNC mill and lathe still in their wrap.</p><p class="small">Coming soon: turn scrap into parts.</p>`,
    "move-in": () => recapHtml("Move in", "All four floors are built. The tower is ready for its first family."),
    "soft-end": () => recapHtml("The pod finished without you", "Day 120. The pod built what it could on its own. Next time, bring it what it needs sooner."),
  };
  function recapHtml(title: string, lead: string) {
    const c = recap(run);
    return `<h2>${title}</h2><p>${lead}</p><ul class="recap"><li><strong>${fmtDay(c.days)}</strong> ${c.days === 1 ? "day" : "days"} <span>(par about ${c.par})</span></li><li><strong>${c.collapses}</strong> ${c.collapses === 1 ? "collapse" : "collapses"}</li><li><strong>${c.storms}</strong> ${c.storms === 1 ? "storm" : "storms"} waited out</li><li><strong>${c.scrap}</strong> scrap hauled</li><li><strong>${c.floors}</strong>/4 floors</li></ul>`;
  }
  function renderCard() {
    const sp = run.stormPrompt;
    if (sp && run.status === "playing") {
      const len = sp.end - sp.start, after = Math.max(0, Math.round(stormOutlook(run, sp)));
      const tb = chooseStorm(run, "back").activity; const home = fmtDay(tb.kind === "trip" ? tb.phaseEnd : run.day);
      card.hidden = false;
      card.innerHTML = `<div class="card-box is-storm" role="alertdialog" aria-modal="true" aria-labelledby="storm-h"><h2 id="storm-h">Storm tomorrow</h2>
<p>The pod warns: a storm hits on day ${fmtDay(sp.start)} and lasts ${plural(len, "day")}. Out here, foraging stops while it blows.</p>
<ul class="storm-opts"><li><strong>Wait it out:</strong> ${String(TUNING.condition.stormOutdoorsPerDay).replace("-", "−")} Condition a day, then keep foraging. You'd be at about ♥ ${after}/10.</li>
<li><strong>Turn back:</strong> keep what's in the bag, home on day ${home}.</li></ul>
<p class="card-acts"><button type="button" class="btn ghost" data-act="storm-back">Turn back</button><button type="button" class="btn go" data-act="storm-wait">Wait it out</button></p></div>`;
      return;
    }
    const c = run.cards[0];
    if (!c) { card.hidden = true; card.innerHTML = ""; return; }
    card.hidden = false;
    card.innerHTML = `<div class="card-box" role="dialog" aria-modal="true">${CARDS[c]()}<p class="card-acts">${c === "move-in" ? `<button type="button" class="btn go" data-act="farm">Go to Farm</button>` : ""}<button type="button" class="btn ${c === "move-in" ? "ghost" : "go"}" data-act="card" data-card="${c}">${c === "move-in" || c === "soft-end" ? "Close" : "OK"}</button></p></div>`;
  }
  function render() { renderStrip(); renderPanel(); renderCard(); }

  el.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act],[data-hex]"); if (!t) return;
    if (t.dataset.hex) { sel.hex = t.dataset.hex; renderPanel(); return; }
    const act = t.dataset.act;
    if (act === "toggle") { open = !open; renderPanel(); return; }
    if (act === "days-" || act === "days+") { sel.days = Math.max(1, Math.min(6, sel.days + (act === "days+" ? 1 : -1))); renderPanel(); return; }
    if (act === "next") { const r = advance(run); set(r.run, r.events.filter((x) => x.kind !== "info" || r.events.length === 1)); return; }
    if (act === "deliver-gate") return set(deliver(run, "gate"), [{ text: "Delivered to the pod.", kind: "info" }]);
    if (act === "deliver-shelter") return set(deliver(run, "shelter"), [{ text: "Delivered to the shelter.", kind: "info" }]);
    if (act === "help") return set(helpUnfold(run));
    if (act === "shelter") return set(workShelter(run));
    if (act === "rest") return set(rest(run, 1));
    if (act === "turnback") return set(turnBack(run));
    if (act === "go" && sel.hex) { const order = [sel.keep, ...(["scrap", "stone", "wood", "food"] as Res[]).filter((r) => r !== sel.keep)]; set(startTrip(run, sel.hex, sel.days, order)); sel.hex = null; return; }
    if (act === "storm-wait" || act === "storm-back") { const r = chooseStorm(run, act === "storm-wait" ? "wait" : "back"); return set(r, [{ text: act === "storm-wait" ? "You'll wait the storm out." : "Turned back for home.", kind: "info" }]); }
    if (act === "card") return set(dismissCard(run, t.dataset.card as Card));
    if (act === "farm") { set(dismissCard(run, "move-in")); opts.onFarm(); return; }
    if (act === "reset") { if (confirm("Start the pod over from day 0?")) set(newRun(seedOf(cell), loopHexes(cell))); return; }
  });
  el.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.dataset.act === "keep") { sel.keep = t.value as Res; renderPanel(); }
    if (t.dataset.act === "queue") set(queueDeliver(run, (t as HTMLInputElement).checked ? "gate" : null));
  });
  render(); opts.onChange(run);
  return { dispose: () => el.remove(), run: () => run };
}
