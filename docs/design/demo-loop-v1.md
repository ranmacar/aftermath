# Aftermath: first playable loop, spec v1 (Sid, Oct 2026)

Status: **GO** on Bob's proposed loop, with three additions:
- **food upkeep** and **Condition**, so foraging is a choice and not just a fetch;
- **rough shelter** as a parallel build, the §5c trigger for the CNC floor;
- **storms with a one-day warning**, so timing matters.

All numbers are first-pass tuning. Keep them in one `tuning.ts` / JSON so we can change them without code.

## 1. The loop
1. Pick a hex to forage, from the hexes around home.
2. Pick how many days to stay.
3. The trip resolves event to event.
4. Haul home.
5. Deliver to the pod gate, the shelter, or the stockpile.
6. Advance to the next event, then repeat.

The pod builds in the background between gates. The player is always choosing between "feed the gate" and "stay fed and safe".

## 2. State
- **Day** (float, starts at 0). One forage day = 1.0. Travel per ring = 0.5 day each way.
- **Stock at home:** food, wood, stone, scrap. Start: food 8, everything else 0.
- **Carry:** capacity 12 load. Food, wood and scrap weigh 1 per unit; stone weighs 2.
- **Condition:** 0–10, start 10.
  - Eating 1 food per day: no change.
  - No food that day: −2.
  - Resting a day at home: +2, up to 10.
  - Outdoors in a storm: −3 per day.
  - Sitting out a storm at home before the shelter is built (lean-to by the container): −1 per day.
  - Shelter built: 0.
- **Collapse:** Condition reaches 0. You lose 2 days, lose half the load you're carrying, and wake at home with Condition 4. There's no death in the demo.

## 3. Hexes and yields
- Ring-1 neighbours are typed from OSM landuse when it's available, otherwise from a seed. Guarantee at least one forest, one field and one ruin in ring 1.
- **City edge** is the nearest built-up hex, clamped to ring 3 (1.5 days each way).
- Yield per forage day:
  - **Forest:** wood 6, food 1.
  - **Field / meadow:** food 4, wood 1.
  - **Water edge:** food 3. Fresh water is flavour for now.
  - **Ruin / suburb:** stone 4, scrap 2.
  - **City edge:** scrap 6, food 1. Each day there carries a 15% hazard: −2 Condition, plus a toast ("collapsed stairwell").
- **Depletion:** each forage day on a hex cuts its yields by 15%, down to a floor of 30%. Yields regrow 3% per day while the hex is left alone. This pushes the player to rotate hexes.
- **After a storm:** ruin and city hexes get +50% scrap for 5 days (debris exposed). Food hexes get −30% for 3 days.
- Carry capacity caps the trip. A city day yields 6 scrap, so about 2 days fills the bag.

## 4. Pod gates (raw scrap in the demo)
The pod pauses at each gate until the delivery is complete, then builds over the listed time.

- **G1 Solar:** 12 scrap, plus a "help: unfold array" action (0.5 day, at home). It builds in 3 days.
  - **Reward:** power on. Show a robot-dog "charging…" card as a teaser; the dog itself comes after the demo (§5c).
- **G2 Dig:** 10 scrap and 20 wood (pit shoring). It builds in 8 days.
- **G3 Rise:** per floor, 8 scrap and 4 stone. Each floor builds in 6 days (the §5c pace).
  - The demo tower is 4 floors.
  - Deliver floor by floor. A floor's gate opens when the previous floor starts building, so you can pre-pay one floor ahead.

### Parallel build: rough shelter
- Cost: 15 wood and 8 stone, plus 2 days of player work at home.
- Available any time after G1.
- When it's done, the container digs itself out and the first underground floor appears. Show the CNC + lathe as a "coming soon" card (§5c).
- From then on, storms at home cost 0 Condition.

### Totals the player must gather
- **Scrap:** 54
- **Wood:** about 35
- **Stone:** about 24
- **Food:** about 45 over the run

## 5. Clock and events
- **Advance to next event.** Events:
  - trip returns
  - gate built
  - floor built
  - storm warning
  - storm start
  - storm end
  - Condition ≤ 3
  - stock food = 0
- **Storms** come every 8–12 days (seeded) and last 1–2 days. The pod flags a **warning 1 day ahead**.
  - During a storm, outdoor foraging stops.
  - A player caught in the field takes −3 Condition per day and gets the option to "turn back" (lose the remaining days, keep the load).
  - Solar and pod building continue; the storm is flavour for the pod.
- **Queueing:** while paused, the player can queue a trip and a delivery. Both fire when time runs.

## 6. What the player decides each step
- **Where:** yield mix vs distance vs depletion vs hazard. The city is the scrap jackpot but costs 3 days of travel and carries risk.
- **How long:** a longer stay fills the bag, but the storm forecast and food on hand push back.
- **What to carry:** at 12 load, stone (weight 2) competes with scrap.
- **Where it goes:** gate now vs shelter first (storm safety, CNC tease) vs a food buffer.
- **When to rest:** Condition vs tempo.

## 7. Demo end state
- **Win / session end:** all 4 floors are built. Show the "**Move in**" card, which links to Farm mode as the next chapter.
- **Recap screen:**
  - day count (par: about 50 days, "a couple of months")
  - number of collapses
  - storms survived
  - scrap hauled
- **No hard fail.** The pressure comes from soft cliffs: collapse costs time and load. If Day > 120, end anyway with a "the pod finished without you" recap. It's gentle but it stings.

## 8. Open questions
- **Parts vs raw scrap:** raw scrap for the whole demo. Once the CNC exists (after the demo), Rise gates ask for **parts**: 1 part = 2 scrap + 0.5 day of CNC time, queued in the background. That gives the CNC a purpose and keeps the demo simple.
- **Survivors:** not in v1. First hook for v2: a city-edge event, "a survivor needs 3 food to follow you home", who then adds +4 carry on trips.
- **Real-world hex typing:** OSM landuse → hex type mapping. Bob's call on the data source; fall back to a seed.
- **Using `crops.ts`:** not in this loop. It becomes useful at Move in / Farm.
