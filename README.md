# Aftermath

A slow game about rebuilding after the grid goes dark, played on the real map.

A solar storm has burned out most of the world's electrical infrastructure. Before it hit, someone buried tens of thousands of shipping containers upright, each one a seed pod. You dig one out. It wakes, digs itself in, and grows a midrise tower. You survive beside it, bring people in from the failing cities, move in, and turn the land around it into a farm.

There's no wave defense and no gacha. The game is about stewardship: one tower, one hex of living land, then a network.

Aftermath is part of **Arbolis**, a story world told in novels and games. Arbolis is also the name of the main city, founded around the Consortium base. The game is set in the time of the fourth Arbolis book and shares its canon. Links to the novels will follow when their pages are ready.

## Status

Early prototype. It runs and you can walk around in it, but it isn't a game yet.

What works today:
- **Map**: pick a real hex (H3 resolution 10, about 1.5 ha) anywhere on Earth
- **Look**: see that place in 3D (free maps, or photorealistic tiles if unlocked)
- **Build**: first-person on the cell: solar, dig, rise
- **Farm**: a finished tower with an Agrokruh ring of 18 beds, a crop schedule, people walking around, fly mode

What doesn't exist yet: the survival loop, resources, survivors, the satellite mesh, expansion to neighbouring hexes, balance. See [docs/design/GDD-mechanics-v0.md](docs/design/GDD-mechanics-v0.md).

**Play the live demo:** https://ranmacar.github.io/aftermath/

## Why

The short version is in [docs/VISION.md](docs/VISION.md). The game is a way to make one idea tangible: people can live densely *and* leave almost all the land growing. The towers and the farm ring in the game are based on real, open designs we're working on. The themes behind it each have a short page in [docs/themes/](docs/themes/).

## Run it locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173 (use localhost so geolocation works over HTTP).

### Modes

1. **Map**: MapLibre (OpenFreeMap), H3 res-10 cells
2. **Look**: Google Photorealistic 3D Tiles if a key is unlocked, else free Esri + Terrarium
3. **Build**: first-person Babylon on the cell (quests: solar → dig → rise)
4. **Farm**: finished tower + Agrokruh beds, crowd patrols, fly mode (hold Space)

### Photorealistic Look

At startup, enter the site password to decrypt the sealed Cesium ion token in the browser, or continue with free maps. The password is not in the repo. Reseal with:

```sh
TILES_KEY='…ion token…' UNLOCK_PASSWORD='…' npm run encrypt-tiles-key
# paste the blob into apps/web/src/cesium-ion.ts as SEALED_ION_TOKEN
```

### GitHub Pages

`.github/workflows/pages.yml` deploys to the `gh-pages` branch:

- push to `main` → https://ranmacar.github.io/aftermath/ (latest; version folders are kept)
- push of a tag `v*` → `https://ranmacar.github.io/aftermath/<tag>/`, e.g. `/aftermath/v0.1.0/`
- **Actions → GitHub Pages (versioned) → Run workflow** with `ref` set to a tag or `main` rebuilds any ref (used for `v0.1.0`, the legacy procedural build, also on branch `legacy`)
- `versions.json` and `versions.html` at the site root list every deployed version

The base path comes from `PAGES_BASE` (or `GITHUB_PAGES=1` → `/aftermath/`); the workflow also passes `vite build --base`, so old refs build correctly. Local check: `PAGES_BASE=/aftermath/v9.9.9/ npm run build`.

## Layout

- `apps/web`: Vite + MapLibre + Babylon UI
- `packages/sim`: settlement quests, crop catalogue, Agrokruh bed schedule
- `scripts/`: tiles-key sealing, CAD sync, helpers
- `cad/`: Onshape models synced to GLB (`npm run cad:sync`)
- `docs/`: [vision](docs/VISION.md), [themes](docs/themes/), design, asset pipeline

## Get involved

It's small and early, which means a good idea can still change it.

- **Play and tell us what felt wrong.** Open an issue. Specific beats polite.
- **Know farming, soil, water or construction?** We'd rather be corrected now than later. Open an issue tagged `reality-check`.
- **Code, 3D, art:** look for issues tagged `good first issue`. (TODO Martin: create the `good first issue` and `reality-check` labels if you want outside help.)

## Licences

Everything here is open, under three licences that fit what each part is:

- **Code** (`apps/`, `packages/`, `scripts/`): [MIT](LICENSE). Use it for anything; keep the notice.
- **Hardware designs** (`cad/`, the Onshape FeatureScript for the tower, pod and Agrokruh): [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt). Build and modify them freely; if you share modified designs or products made from them, share the modified source under the same licence.
- **Story, art and docs** (`docs/`, text, non-CAD art): [CC BY-SA 4.0](LICENSES/CC-BY-SA-4.0.txt). Credit "Aftermath (Arbolis) by Martin Vavrovič" and share alike.

Contributions are accepted under the licence of the part they touch.

Made by Martin Vavrovič.
