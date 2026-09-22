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

### Google 3D tiles (optional)

Startup popup:

1. Unlock a sealed demo key with the site password (decrypt in-browser only),
2. Paste your own Map Tiles API key (session only), or
3. Continue with free maps

Seal a key for Pages:

```sh
TILES_KEY='AIza…' UNLOCK_PASSWORD='…' npm run encrypt-tiles-key
# paste into apps/web/src/tiles-key.ts as SEALED_TILES_KEY
```

Restrict demo keys in Google Cloud to `https://ranmacar.github.io/aftermath/*` and `http://localhost:5173/*`.

### GitHub Pages

`.github/workflows/pages.yml` builds with `GITHUB_PAGES=1` (base `/aftermath/`). Enable **Settings → Pages → GitHub Actions**.

## Layout

- `apps/web` — Vite + MapLibre + Babylon UI
- `packages/sim` — settlement quests, crop catalog, Agrokruh bed schedule
- `scripts/encrypt-tiles-key.mjs` — seal Map Tiles keys for the unlock popup
