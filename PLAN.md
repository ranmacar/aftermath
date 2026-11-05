# Aftermath — plan

## Demo goals

1. Dig out of the basement → hear the pod
2. Find the pod on Map / Look (H3 hex)
3. Build: solar → dig → rise on local terrain
4. Farm: grown tower + Agrokruh (18 beds: 6 inner + 12 outer), crops/schedule sim, optional sealed Google tiles
5. Loop: an early, imprecise draft of forage, storms, and pod gates. Floors in the game are added over time, and later floors wait on better tech-tree unlocks.

## Done (current tree)

- Basement dig-out, MapLibre + H3 overlay, Look / Build / Farm / Loop
- Tower construction + Farm Agrokruh, LOD neighbors, fly mode, crowd patrols
- `@aftermath/sim` crops + per-bed schedule (exclusive cultivation)
- Draft survival loop in `@aftermath/sim` (default tuning v1.3) and its Loop screen
- Client-side Cesium ion unlock + free-map fallback
- GitHub Pages: landing at `/aftermath/`, demo at `/aftermath/play/`
- Onshape `game-v0.2` GLBs synced into `apps/web/public/models/site/`

## Next

- Tech tree that unlocks further floors (the loop's floor count is a draft placeholder)
- Seal the Google Map Tiles key (`SEALED_TILES_KEY` is still null) and HTTP referrer locks
- Survivors, satellite mesh, expansion to neighbouring hexes
