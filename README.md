# Aftermath

Regenerative Habitat game on a real map: pick an H3 cell, Look / Walk / Habitat, grow an Agrokruh around a midrise tower.

## Run locally

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173** (use localhost so geolocation works on HTTP).

### Modes

1. **Map** — MapLibre (OpenFreeMap), H3 res-10 cells
2. **Look** — Google Photorealistic 3D Tiles if a key is unlocked, else free Esri + Terrarium
3. **Walk** — first-person Babylon on the cell (quests: solar → dig → rise)
4. **Habitat** — finished tower + Agrokruh beds, crowd patrols, fly mode (hold Space)

### Photorealistic Look

Startup popup:

1. Enter the site password to decrypt the sealed Cesium ion token in the browser, or
2. Continue with free maps

The password is not in the repo. Reseal with:

```sh
TILES_KEY='…ion token…' UNLOCK_PASSWORD='…' npm run encrypt-tiles-key
# paste the blob into apps/web/src/cesium-ion.ts as SEALED_ION_TOKEN
```

### GitHub Pages

`.github/workflows/pages.yml` builds with `GITHUB_PAGES=1` (base `/aftermath/`). Enable **Settings → Pages → GitHub Actions**.

## Layout

- `apps/web` — Vite + MapLibre + Babylon UI
- `packages/sim` — settlement quests, crop catalog, Agrokruh bed schedule
- `scripts/encrypt-tiles-key.mjs` — seal Map Tiles keys for the unlock popup
