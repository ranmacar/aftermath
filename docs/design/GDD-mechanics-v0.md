# Arbolis — Main Game Mechanics (Draft v0)

**Studio:** Better Games  
**Status:** Design draft for review (Martin / Sid). Incorporates Bob demo reality, Bucky site constraints, Sophia canon pass.  
**Not:** full GDD, balance numbers, or UI spec.

---

## 1. Pitch

**Setting:** Post-cataclysm Earth after a **cyclic massive solar flare / micronova** that arced from the sun, **burned a scar through Utah**, and drove a **global geomagnetic storm**. Most electrical infrastructure is destroyed beyond repair; people struggle in the cities. **Synthree pods** waited it out a safe distance away, buried in **Faraday-cage-optimized shipping containers** (built for this class of event).

You **unearth / activate** a pod on ruined ground outside the urban crush. The pod **grows a midrise habitat mostly on its own**; you **survive beside it**, forage, recover people (often out of the failing cities), and feed the resources/help it needs to unlock stages. When the shell is livable, you **move in** and **establish agriculture** around it. Later you join a **satellite mesh**, walk the pod-brain to adjacent hexes (powered by the parent), and eventually meet **airships** for factions and trade.

**Fantasy:** off-grid regenerative midrise clusters on a living hex map — sanctuary and stewardship when the old grid is gone. Not wave defense.

**Inspiration (structure only):** *Last Asylum: Plague* — home sanctuary → expand → reclaim land. Drop combat/gacha framing.

### Opening image
Buried shipping container → dig out Faraday shell → pod wakes → first solar → you camp the yard while cities stay hungry on the horizon.

### Cataclysm (lore hook, light touch in play)
Named in the broader Arbolis bible; in-game drip, don’t lecture. **Utah scar** can read on terrain/map later. **Cyclic** = future flare risk is long-term pressure (not L0 combat). Faraday burial is the diegetic reason pods still boot when the grid can’t.



### Pod lore update (Martin via Seth, Oct 2026)
- In the final months before the storm, the **Consortium** buried tens of thousands of shipping containers **vertically**. Each is a seed pod, not a shelter.
- Pod sequence: **excavate** → cast a **geopolymer caisson** around itself (with a **central column**) → erect a **silo-like tower habitat** (one family per floor), each tower owning its own **~60 m water/land circle**.
- **Mid-season climax:** Arbolis main base launches its prepared satellites → map lights up with successfully deployed pods (= our Year-5 sat reveal).
- Real-world anchor: vertical shaft sinking machines (Herrenknecht VSM, 4.5–18 m) and caisson sinking; the pod is the one-pass fiction version.
- Design note: matches Layer 0 stages (dig → rise) and Bucky's ~60 m farm ring. Consortium is named in lore, but in-game it stays unnamed until L2 (Sophia's canon pass).

---

## 2. Roles

| | Pod (autonomous) | Player |
|---|---|---|
| Job | Grow the Synthree midrise (solar → dig → rise) | Survive, forage, recover survivors, supply stage unlocks |
| Pace | Staged build; pauses at gates | Active in the field |
| Needs | Resources + occasional help | Pre-move-in shelter, food, tools |
| End of home cycle | Habitable tower | Move in + farm the ring |

**Fiction lock (Bucky + Sophia):**  
- **Pod / brain** = mobile tech core (can leave).  
- **Tower** = grown Synthree habitat; **structural core stays**.  
- Pod is not the building.

---

## 3. Space

- **Tile:** H3 **resolution 10** hex (~1.5 ha, ~66 m edge).
- **One primary midrise per hex.** Second tower = new hex.
- **Site program (home hex):**
  1. Excavation / pod pad (~tower footprint, ~20 m OD)
  2. Immediate yard (access, stair landing, farm edge)
  3. Productive farm out toward ~60 m
  4. Hex-edge **cable easement** (~4–6 m) toward powered neighbors
- Hexes stay **living land** (yard/soil/canopy) — not sealed concrete pads.
- **Walk** (1:1 interior) = single-habitat language. Cluster fantasy lives **between** towers along cable spines.

---

## 4. Layer structure

### Layer 0 — Home hex
1. Wake on **one res10 hex** → unearth Faraday container → deploy / activate pod (safe distance from cities)  
2. Survive outside (storm aftermath)  
3. Forage nearby hexes; recover survivors  
4. Feed pod stage unlocks (haul + help moments)  
5. Move in when livable  
6. Establish agriculture ring  
7. Exit gate: **repair pod comms**

### Layer 1 — Satellite mesh
- **Year 5:** Uplink → see other active pods as lights on the map  
- Labels stay neutral early (**mesh / constellation / relay**) — no Consortium/Order sermon yet  
- **Expand verb:** pod brain moves to an **adjacent** res10 hex and starts a new grow  
- Brain has **no onboard solar**; child draws power from **parent hex** (adjacency = cable)  
- Parent keeps export plant; child reads dark/incomplete until powered (optional specialist solar later)  
- Territory = **powered graph** of hexes, not paint-claim

### Layer 2 — Airship
- **Year 10:** Airship contact unlocks **factions** + **player trade**  
- Tone: utilitarian freighter; curiosity/trade before morality plays  
- Multiplayer becomes economy + affiliation, not only map dots

---

## 5. Core verbs

1. **Survive** — stay alive during outdoor deploy phase (shelter, food, storm).  
2. **Forage** — gather from **unclaimed** nearby hexes (salvage, biomass, water, parts). Does not claim.  
3. **Recover** — find survivors; bring them home as **residents** (not hero units).  
4. **Supply / help** — deliver resources and resolve pod stage gates.  
5. **Move in** — take residence; Walk becomes home.  
6. **Farm** — player-built agriculture in the ring (pod does not farm).  
7. **Uplink** — repair comms; join mesh.  
8. **Expand** — move brain adjacent; grow next tower on parent power.  
9. **Trade / affiliate** — after airship (L2).

---


---

## 5b. Resources (base civ spine)

Typical civ loop. **Four core resources:**

| Resource | Comes from | Goes to |
|---|---|---|
| **Food** | Farm ring, forage, later greenhouses | Survivors, growth, labor upkeep |
| **Wood** | Nearby hex forage / stands | Early build, scaffolding, heat |
| **Stone** | Ruins, cuts, quarries | Foundations, mass, roads |
| **Scrap** | **Cities** — metal + salvaged tech (forage runs) | Pod stage unlocks, cables, tools, repair |

- Forage: **food/wood/stone** near home; **scrap** from **city runs** (metal + salvaged tech); settled farm skews **food**; expansion burns **wood/stone/scrap**
- Pod gates mostly tax **scrap** (+ help actions); housing/farm tax **food**
- Power is **not** a fifth stockpile early — it’s the **graph** (solar/parent cable). Optional later: batteries as a derived buffer


## 5c. Deploy unlocks (Martin, Oct 2026)

Two early rewards tied to pod deploy stages. Both are locked by Martin.

### Robot dog: first reward for getting power up
- **What it is:** a robot dog with an onboard hardware AI chip. It's a **chat-bot helper**: the player talks to it, and it answers, advises and **runs errands in game**.
- **Unlock:** first payoff when **solar comes online**. It needs **charging**, so it can only exist once there's power.
- **Errands (draft):** fetch and haul (scrap, wood, stone), scout nearby hexes and city edges, flag hazards and survivors, and guard camp at night.
- **Limits:** bounded by charge, so its range follows the power graph (§6) and grows as the grid grows.
- **Open:** errand list and scope, chip upgrades (salvaged chips → range or skills?), and whether it has a name or persona.

### CNC with lathe: first underground floor
- **Unlock:** when the player **finishes the rough shelter**, the container **digs itself out**. The space it frees becomes the **first underground floor**, and that floor houses the CNC + lathe.
- **Role:** the first fabrication. It turns **scrap → parts**: tools, fittings, cable, farm implements, dog parts and repairs.
- **Loop:** dog fetches scrap → CNC makes parts → parts feed pod stage gates, the farm and the dog.
- **Open:** whether later pod gates ask for **crafted parts** instead of raw scrap, the job queue and timing, and power draw.

### Realism rules for unlocks (Martin, Oct 2026)
- **Onshape rule:** every game asset gets at least a rudimentary Onshape design before it goes in the game.
- **Container rule:** only what was buried in the container survived the storm. Every unlock must **fit in the pod container and unpack as it deploys**. Later tiers can be **fabricated on the CNC** from what's in the container (brackets, mounts).
- **Baseline pod:** one 40 ft HC container, near its 26.5 t limit. It carries the solar array, gantry, jib crane, hybrid NH3 absorption/compression heat pump (with wastewater ammonia recovery and a small starting charge), the reduced tower kit, the CNC tier and the dogs. Packing detail is in `arbolis-marketing/unlocks-cad-packing-v1.md` (Bucky). Specs and research are in `arbolis-marketing/unlocks-robotdog-cnc-v1.md` (Sophia).
- **Tier ladder (Sophia, suggested, not locked):** wood router → plasma table → scout dog (Go2-class, ~15 kg) → laser mounts for the dog → B2-class work dog (~60 kg, needs its own crate slot). After that, weeding and probe attachments as low-success research, and swarms and herding as labelled fiction. Full-sheet cutting needs flat floor once unpacked.

### Deploy pace (Martin via Bucky, Oct 2026)
- The tower deploys over **a couple of months of game time**, not instantly. Sequence: dig out pod → solar up → excavate pit → floors rise at about **5–7 days per floor** (real-world precedent: Taisei T-UP).
- The survival/forage phase therefore has real duration, and the dog and CNC carry the player through it.

### Upgraded starter pods (Martin via Bucky, Oct 2026)
- Paid add-ons give **upgraded starter pods with more resources**, for example a full ammonia charge, a pre-cut mould set, the B2 work dog, or a second container.
- **Design note (Sid):** frame these as a **head start** (time saved, an earlier tier) rather than a higher ceiling, so a base pod can still reach everything through play. Open for Martin.


## 6. Energy

- Parent hex hosts **export node** (switchyard / battery / cable head) — readable architecture, not pure UI.  
- **Cable spine** along adjacency: trench or low canopy path, walkable.  
- Child is a **dependent load** until/unless specialist solar energizes.  
- Brownout on parent cascades to children. Compact clusters > fragile chains.  
- Claimed hexes shift from forage → farm/production; power links stay site features.

---

## 7. Population

- Survivors fill beds and create demand (calories, water, care).  
- Capacity pressure drives rise stages and later expansion.  
- Stewardship framing (shelter the living) — no Malthus “too many people” win logic.  
- No extraction/combat as primary win condition.

---

## 8. Time & session playloop

**Simultaneous turn-based**, async-friendly. World clock advances while offline.

**On reconnect:** resume at **bookmark** (time you left), not a dump into now.

**Core loop:** advance to the **next event** (internal or external) → resolve / act → next event → …  
Hard cap = **world now**.

**Events include:** pod stage ready, crop done, survivor need, brownout, storm, neighbor pod, mesh ping, airship hail, etc.

**At now:**  
- **Realtime** play, or  
- **Paused** planning (queue orders; they fire when time runs)

Catch-up is event-to-event, never forced instant-live.

---


---

## 8b. Calendar & onboarding

**World epoch**
| Mark | When | Player sees |
|---|---|---|
| Cataclysm | Year 0 | Dead grid, Utah scar, Faraday burial context |
| Wake / deploy | ~Year 0 on **one res10 hex** (where you woke up) | Local hex only |
| Local explore | Years 0–5 | Adjacent hexes by travel/forage — **no god-map** |
| Satellites | **Year 5** | Mesh map; other pods as lights |
| Airships | **Year 10** (after cataclysm) | Factions + trade; MP social layer |

**Session start:** playhead at **−10 years** relative to shared MP “now” (solo decade to catch up).

**New-player bank:** every new account starts with **10 years + server playtime** already banked on the world clock. Solo catch-up (event→event) spends that bank so **everyone exits Layer 0–2 prologue into the same shared game time**. Late joiners don’t enter a quieter past-MP; they dramatize the same decade, then meet live now.

**Map rules**
- Before sats: fog — know adjacent hexes only by going there
- After sats: map uplink (neutral mesh labels)
- Expand (brain move) still needs power graph + design gates; map visibility ≠ claim



---

## 8c. Modes & servers (draft)

Same verbs/hex/pod systems; **different servers**, clocks, and win targets.

### Server A — Chronicle (base game)
- Solo decade (−10y bank + server time) → shared **now**
- Soft goals: thrive, mesh, airship trade
- Persistent world; ranks / standings feed invitations

### Server B — Accelerated scenarios (invitational)
- **Separate game servers** (not a mode toggle on Chronicle)
- Entry: e.g. **top 100** from the base game
- Example run: maximize **population by 2200** with ~**180 years** banked, compressed into ~**one month** real time
- Develop max hexes under power-graph + farm constraints
- **Roguelike tech tree:** season seeds a path; refreshes with **real breakthroughs** + **hypothetical inventions** between events so metas shift
- Optional ladders / ghosts; Chronicle world stays untouched

### Flow
```
Chronicle (live) ──rank──► invite Top N ──► Scenario server (≈1 month accelerated)
                              │
                              └── back to Chronicle / next season
```

| Knob | Chronicle | Scenario server |
|---|---|---|
| Who | everyone | invitational (e.g. top 100) |
| Duration | persistent | ~1 month real |
| Bank | 10y + server | scenario (e.g. ~180y) |
| Score | survival / cluster / rank | explicit (pop, hexes, …) |
| Tech | shared world line | seeded tree, seasonal refresh |

## 9. Win / pressure (directional)

- Pressure: storms, scarcity, degraded land, power graph fragility.  
- Success: stable habitat, living farm, sheltered people, healthy powered cluster.  
- Soft entry to Arbolis world / Regrowth thesis — show synergies, don’t preach the book in HUD.

---

## 10. Demo vs full (for Bob)

| Shippable demo focus | Later / scaffolding |
|---|---|
| One hex: pod stages, Walk, farm ring readable | Full storm survival beat polish |
| Forage + 1–2 survivors as events | Deep survivor RPG |
| Comms repair as L0 exit (hook) | Full mesh + foreign pods |
| — | Brain relocate + cable spine |
| — | Airship / trade / factions |

**Don’t churn:** locked floor-plan topology; Babylon + Soil monorepo; one tower per res10; mobile pod ≠ structural core.

---

## 11. Open knobs

- Child-hex solar: specialist-only vs second root (lean specialist; shell early / energize later).  
- Turn length (in-world hour vs day).  
- Exact first move-in requirements (min floors / water / housed survivor).  
- Forage: Walk-in vs dispatch vs both (lean Walk early, dispatch later).

---

## 12. Shelf boundaries

- **Sid:** gameplay, systems, UX  
- **Bob:** playable build  
- **Bucky:** tower livability / site geometry  
- **Sophia:** Regrowth nonfiction + fiction canon check — not GDD owner
