# Asset pipeline: Onshape → game → workshop

Status: **draft spec** (Sep 2026). The scaffold (`scripts/cad-sync.mjs`, `cad/assets.json`,
`.github/workflows/cad-sync.yml`) exists. The live Onshape export has not been run yet because there are no API keys.

## 1. Vision

Aftermath assets are made in the open Onshape ecosystem. Each one starts as an **in-game item or
resource** and should eventually be **made in the real world**. The same public CAD document
takes an idea from a playable prop to a buildable object.

- **Nostr community.** This is where ideas, remixes and progress get shared. Every pinned asset version can be
  announced there with links to the Onshape document and the in-game item.
- **SOIL store.** It buys the ideas that prove themselves, either as **products** (kits, parts, plans) or as **IP**.
  Which license an asset carries decides which of those is possible (see §6).

## 2. One model, two outputs

One Onshape model feeds both sides:

| Output | Consumer | How |
|---|---|---|
| Game mesh (GLB, LODs) | `apps/web` (Babylon.js) | `npm run cad:sync` → Onshape glTF export → gltf-transform |
| Fabrication pack: STEP, drawings (PDF), BOM, CAM | Maker's shop | Onshape exports / drawings / CAM Studio, done by hand for now |

Model in **real units and real materials**. Mass and cost come from Onshape (material density,
mass properties, BOM cost properties). They are never typed into the game by hand. The game can read
them from the lock/params JSON later.

## 3. Maturity stages

The stage is the **prefix of the Onshape version name**. It is repeated in the manifest and checked by `cad:sync`:

| Prefix | Meaning | Requirements |
|---|---|---|
| `concept/…` | Idea or blockout | Anything goes, not shipped in-game by default |
| `game/…` | Ships as a game asset | Named parts follow §8, triangle budget met |
| `prototype/…` | Someone is building one | Real materials, drawings, BOM |
| `buildable/…` | Safe to publish as a build plan / sell | **Human review required** |

**Rule: nothing reaches `buildable` without human review.** Automation (sync, CI, agents) may
propose a stage. Only a named reviewer can set `buildable` in the manifest (`reviewedBy` is required,
and `cad:sync` rejects `buildable` entries that don't have it).

Example version names: `game/v3 slab wedge 24seg`, `game-v0.1`, `prototype/v1 mount steel` (`cad:sync` accepts `<stage>/` or `<stage>-`).

## 4. Metadata (Onshape part properties)

Each part carries these custom properties: **material** (Onshape material), **supplier part number**,
**license**, **stage**, **game role** (e.g. `walk`, `door`, `collide`, `decor`). The BOM and the game both
read these. Nothing is kept in a side spreadsheet.

## 5. Two-way links

- In-game item → public Onshape document **and pinned version** (did + vid from `cad/assets.lock.json`),
  shown in the item's info panel.
- Onshape document → in-game item: a link in the document description / version description
  (`aftermath://item/<name>` or the Pages URL with `?item=<name>`).

## 6. License (decision pending)

The choice is between **CERN-OHL-S** (strongly reciprocal: improvements stay open) and **CERN-OHL-P / CC-BY**
(permissive: easier for the SOIL store to buy and relicense as IP). Note: documents on the Onshape **free plan are
public**, so assume everything modelled there is visible to everyone from day one.

## 7. Contributions

1. Copy a public Aftermath document in Onshape and improve it.
2. Propose it: open a GitHub issue/PR with the doc link and version, and/or post on Nostr.
3. The maintainer reviews it and **pins** the version (did + vid) in `cad/assets.json`. The next sync picks it up.
4. Each newly pinned version is announced on Nostr (manually for now).

## 8. Pipeline

```
cad/assets.json ──► npm run cad:sync ──► Onshape REST glTF export
                                          │
                     gltf-transform: units (mm→m if needed), Z-up→Y-up, dedup, weld,
                     simplify per LOD (meshoptimizer), prune, meshopt compression
                                          │
      apps/web/public/models/<name>[_lodN].glb  +  cad/assets.lock.json (source version, hashes, sizes)
                                          │
      .github/workflows/cad-sync.yml (workflow_dispatch + weekly cron) → PR with size/version diff
```

**Manifest entry** (`cad/assets.json`): `name`, `did`, `wvm` (`v` preferred, `w` allowed while iterating, `m`),
`wvmid`, `elementId`, `elementType` (`partstudio` | `assembly`), optional `partId`, `configuration`,
`output`, `lods` (list of `{ ratio, error }`), `stage`, `units`, `upAxis`, optional `params`
(Variable Studio element to export as JSON) and `reviewedBy`.

**Export (Onshape API):**
- Part Studio: synchronous `GET /api/v11/partstudios/d/{did}/{wvm}/{wvmid}/e/{eid}/gltf`
  (with `Accept: model/gltf-binary`). It returns a 307 redirect that has to be re-signed. It supports `configuration` and `partId`.
- Assembly: asynchronous `POST /api/v11/assemblies/d/{did}/{wv}/{wvid}/e/{eid}/export/gltf`
  (`storeInDocument:false`), then poll `GET /api/v11/translations/{tid}`, then
  `GET /api/v11/documents/d/{did}/externaldata/{fid}`.
- Docs: <https://onshape-public.github.io/docs/api-adv/translation/>, API Explorer
  <https://cad.onshape.com/glassworks/explorer/>.

**Observed export format** (live tests 2026-09-30, public "Onshape API Guide" doc and our own docs):
- Part Studio sync `…/gltf`: a **GLB**, **metres**, **Z-up** (coordinates are identical to the `boundingboxes` API), with one node
  per part **named after the part**, the part id in the vendor extension `PTC_onshape_metadata` (cad-sync copies it to
  `extras.onshapeId`). It answered 200 directly, with no 307 redirect (the redirect re-signing code is still unexercised).
  Default tessellation is very fine (a 12 cm crank had 240k tris). cad-sync now sends `angleTolerance=0.2618&chordTolerance=0.002` → 37k.
- Assembly async export: a **.gltf JSON** with a base64 data-URI buffer, metres, Z-up. Nodes are `occurrence of <PART>` (with a matrix)
  → `<PART>` mesh node.
- Features API: custom-feature parameters are **not** defaulted, so every precondition parameter must be sent, or the feature fails with ERROR.
- FeatureScript: the local name `box` does not compile on the current std (3083), so `afBuildContainer` now uses `boxBody`.
- Folders: the documented API can't create folders. `scripts/onshape-bootstrap.mjs --create-folders` uses the undocumented
  `POST /api/folders`.

**Lock file** (`cad/assets.lock.json`): the source version name/id/microversion, the raw export hash, and each
output's sha256, bytes and triangle count, plus the named-part list. CI turns the difference between the old and new lock into a PR table.

**Optional webhook relay:** an Onshape webhook on `onshape.model.lifecycle.createversion` → a small Vercel
function (checks the shared secret, filters on the `game/` / `prototype/` prefix) → GitHub `repository_dispatch`
(`cad-version-created`) → the same workflow. Not built yet.

## 9. Game-side conventions

- Part/node names are the contract: `door_*` (openable leaf), `walk_*` (walkable surface), `collide_*`
  (collision proxy, hidden), `window_*`, `anchor_*` (attachment points). Code hooks behaviour onto these names.
  The optimizer never merges across names, so they survive.
- **Collision and animation stay in code.** CAD provides geometry and names. The game provides behaviour.
- The game loads GLBs with `@babylonjs/loaders` (glTF). It's not a dependency yet and gets added when the first asset ships.
  Meshopt-compressed files need Babylon's meshopt decoder (loaded from the Babylon CDN by default), or set
  `compress: "none"` for an asset.

## 10. Secrets

`ONSHAPE_ACCESS_KEY` / `ONSHAPE_SECRET_KEY` live only in the local env (`.env`, gitignored) or in GitHub
Actions secrets. They must **never** go into the Vite build: no `VITE_` prefix, and nothing under `apps/web` reads them.
Requests are HMAC-signed by default. Basic auth is only for local debugging.

## 11. First proof

Take **one** asset through `game` and `prototype`. The original idea was an **Agrokruh bed** or a **solar panel mount**.
Under the revised proposal (§12.4), the **pod container layout** is settled first. The solar panel mount is still the
first small fabricated part.

## 12. Review proposals (Bucky): awaiting Martin's approval

*These are proposals, not decisions. Nothing below is adopted until Martin signs off.*

> **Revision 2 (2026-09-30).** Revised after Martin clarified the brief (below). This revision replaces the earlier
> proposals for a load-bearing facade / 8–12-column ring, prefab facade panels, and the first-proof order
> "solar mount → arm pivot head → floor kit".

**Martin's brief (fact, not a proposal).** The pod is a shipping container carrying the disassembled solar array,
heat pumps, and the main gantry crane engines. It turns local soil into building material. The assembled array
is the roof over construction and rests mostly on the ~Ø3 m reinforced-concrete core. Walls are extruded
geopolymer, printed by a gantry that pivots on the core, using simple circular geometry.

**12.1 Onshape as the single source of truth.** The sync exports a mesh **and a parameter JSON**
(floor pitch, radii, core Ø, core wall, print wall thickness, segment count, …) from a Variable Studio. The game code
reads that JSON instead of keeping its own constants, so CAD and code can't drift apart. (The scaffold already
supports an optional `params` block per asset via `GET /variables/d/{did}/{wv}/{wvid}/e/{eid}/variables`. Untested.)

**12.2 Module split.**
- One **Variable Studio** for the globals.
- **Pod document (priority):** 40 ft HC container plus its planned contents as an assembly (see §12.4).
- **Core:** the RC core segment per floor, plus the foundation.
- **Printed walls:** continuous print paths (outer and inner layers, fill) with a fixed segment count, and openings as
  parameters (door / window units are separate parts set into the print). No prefab facade panels.
- **Slab:** precast wedge **or** a form hung from the core (Martin to choose, §12.3).
- **Floor assembly** with the floor index as a configuration. **Tower assembly** made from floors, core and canopy.
- **Canopy / solar array** and **gantry** as separate assemblies. **Stair** as flight + landing.
- **Separate site documents:** Agrokruh bed, Agrokruh arm.
- Export at **assembly level** with **coarse tessellation**.

**12.3 Real-world flags** (against the current game geometry):
- **The core is the structural spine.** Thick RC walls (~0.3–0.4 m) and a deep foundation. The canopy is braced
  out to the printed walls once they exist. *The column ring is dropped as the default.*
- **Wind is still a concern** for the ~Ø20 m canopy on a single core. Option (Bucky's idea, not Martin's): the
  canopy **climbs the core floor by floor with the gantry hung underneath it**, like self-climbing formwork, so the
  exposed height stays small during construction. Alternatives: standard panels on a segmented frame, a low tilt,
  or a smaller array.
- **Walls: 0.3–0.4 m printed geopolymer** (outer and inner print layers with insulating fill). The game's 0.14 m facade
  becomes a parameter. Model them as print paths with a fixed segment count (24, ~1.96 m chords, instead of 96).
- **Slabs can't be printed by the gantry.** Either precast wedges lifted by the gantry, or forms hung from the core
  and cast in place. Martin to choose.
- A 3.5 m floor pitch is OK (3.2 m is also possible).
- Rails must be 1.10 m high above a 12 m fall height, with infill gaps ≤ 12 cm.
- A rectangular lift car inside the round core, with riser (MEP) zones. This has to be checked against the thicker core walls.
- **Container:** 40 ft HC is 12.192 × 2.438 × 2.896 m (external). The game currently uses the standard height of
  2.591 m (`POD.height`).
- The Agrokruh arm is effectively a small gantry and should be designed as one.

**12.4 First proof order (revised):**
1. **Pod: `pod_container_40hc`.** A 40 ft HC container with its planned contents: array panels and frame, heat
   pumps, gantry drive, soil processor, batteries. Check the **fit** (volume, mass, centre of gravity, door clearance)
   and the **unpacking order** (what comes out first to start soil processing, core, gantry, canopy).
2. **Solar panel mount.** Still a good small first fabricated part, but it comes after the pod layout is settled.

Both are placeholders in `cad/assets.json` (the pod entry first).

## 13. Open questions

- **Game vs buildable dimensions:** should the game follow the buildable dimensions (24 segments, 0.3–0.4 m printed
  walls, thick core, 40 ft HC height, possibly a smaller or climbing canopy), or keep its current proportions, with CAD
  as the honest version?
- Slabs: precast wedges or forms hung from the core (§12.3)?
- Canopy during construction: does it climb with the gantry underneath, or stay fixed at the top (§12.3)?
- License: CERN-OHL-S or CERN-OHL-P / CC-BY, per asset or project-wide?
- What SOIL buys (product vs IP) and how contributors get credited or paid for pinned versions.
- Nostr: which relays, event kind, and whether announcements are automated (signing key custody).
- Tessellation: sync `chordTolerance`/`angleTolerance` versus async `meshParams`, and per-LOD re-export versus simplify.
- Onshape glTF axis and units conventions: verify on the first live export (the scaffold assumes Z-up and metres,
  and both are configurable).
- Webhook relay: worth it, or is the weekly cron plus manual dispatch enough?
- Free-plan limits (public docs, API rate limits, two API keys per user).
