# Aftermath / Arbolis: Onshape FeatureScript features

These Onshape custom features rebuild the procedural 3D objects from the Babylon.js app
(`apps/web/src/stages.ts`, `apps/web/src/placements.ts`) as parametric Onshape parts, using the
same dimensions as the code. Every default value is a constant from the code, and the comment
next to each one gives the file and line it came from.

| File | Feature(s) | What it builds |
|---|---|---|
| `ShippingContainer.fs` | Aftermath pod container | Vertical ISO 40 ft container (`buildVerticalContainer`), optionally hollow, optional gantry-stage tech door + racks |
| `PodAssembly.fs` | Aftermath pod assembly | Container + Ø1 m hatch column + console + pitched Ø20 m solar disc, for the **Live pod**, **Excavate** (adds bridge beam + spoil berm) or **Pitched solar** stage |
| `SolarArray.fs` | Aftermath solar array | Ø20 m × 0.12 m disc with torus rim, flat (solar-flat stage, with console) or pitched 35° on a column |
| `FloorSlab.fs` | Aftermath floor slab | Ø20 m slab with Ø3.1 m elevator hole, stair-width opening, optional landing split, balcony rail + gate newels |
| `ElevatorShaft.fs` | Aftermath elevator shaft | Ø3 m core shell per floor with its door cut, frame, curved sliding leaf (pocket-open pose) and track |
| `FloorWalls.fs` | Aftermath floor walls | Ø15 m punched facade (main double door, balcony doors, windows), Ø6.5 m corridor ring, core tangent wall, living/bedroom separator with 2 doors, bedroom/bath wall, radial demises, optional frames/leaves/windows/beds |
| `ExteriorStair.fs` | Aftermath exterior stair | Helical flights on the balcony ring (24 treads per floor over 45° minus the door gates) with inner/outer rails |
| `Tower.fs` | Aftermath tower floor, Aftermath tower | One complete floor (slab + walls + core + rail + flight up), and the full 7-floor tower with buried container, column, pitched solar roof and bridge |
| `Agrokruh.fs` | Aftermath Agrokruh | 18 × Ø22 m crop beds on the 24 m hex lattice (or one bed), crop pads, pivot posts, up to 6 rotating arms |

Every file is self-contained: it has the same constants block and helper functions, so you can
paste any one of them on its own.

## How to use

1. In an Onshape document, click **+** (bottom left) → **Create Feature Studio**.
2. Select everything in the new Feature Studio and paste in the full contents of one `.fs` file.
3. **Check the version line.** Onshape adds a header like `FeatureScript NNNN;` +
   `import(path : "onshape/std/geometry.fs", version : "NNNN.0");` to every new Feature Studio.
   The files here use **2960**, the latest std version in the public std-library mirror
   (javawizard/onshape-std-library-mirror, May 2026). If Onshape's new-studio header shows a different number, replace the
   first two lines with the ones Onshape generated (they must match each other).
4. Click **Commit** (or wait for auto-commit) and make sure the Feature Studio shows no errors.
5. Go to a Part Studio. The toolbar's custom-features button (**⋮ / Custom features**) now lists the
   feature, e.g. *Aftermath floor slab*. Add it, adjust the parameters, and click ✓.
   Features from the same document appear right away. To use them in other documents, add them
   through *Add custom features* in that document.
6. For the whole building, use *Aftermath tower* (from `Tower.fs`) with `Floors = 7`. Its defaults turn
   rails, door leaves and window frames **off** because they add roughly 1,500 sketch/extrude operations.
   Turn them on when you need them, or build one floor at a time with *Aftermath tower floor*.

The Part Studio's own unit setting doesn't matter, because every value carries its unit (`* meter`).

## Axis mapping (Babylon Y-up → Onshape Z-up)

| Babylon (code) | Onshape |
|---|---|
| +X (east) | +X |
| +Z (north) | +Y |
| +Y (up) | +Z |

- A code point `(x, y, z)` becomes the Onshape point `(x, z, y)`.
- Plan angles work the same way. The code places things at `(cos a · r, y, sin a · r)`. In Onshape that is
  `(cos a · r, sin a · r, y)`, with the angle measured from +X toward +Y (counterclockwise seen from above). The door of
  floor `i` is at `90° + i · 45°`, which puts floor 0's door facing +Y (north), just like the code.
- A Babylon `rotation.y = r` becomes an Onshape rotation of `−r` about +Z. The helper `afBabBox` handles this for every
  ported `CreateBox`.
- Babylon's `rotation.x = −pitch` on the solar disc lifts the north (+Z) edge. In Onshape that is a rotation of `+pitch`
  about +X, which lifts the +Y edge.
- Origin: the tower/pod axis at grade (stage root). Grade is Z = 0. The app's extra `gy + 0.04` terrain lift
  is ignored.

## Key parameters and dimensions

| Object | Dimensions (m) and source |
|---|---|
| Container | 2.438 (X) × 2.591 (Y) × 12.192 (Z), `POD.width/height/length` (placements.ts:18-21). Live pod: top at −1 (`POD.buryDepth`). Pit stages: bottom at −13 (`EXCAVATE_DEPTH`) |
| Column / console | Column Ø1 (`POD.tubeDiameter`) up to 2.4 (live) / 3.6 (`EXCAVATE_COLUMN_TOP`) / 3.6 + floors × 3.5 (tower). Console 0.55 × 1.1 × 0.28 placed at x = 0.55 |
| Solar disc | Ø20 × 0.12 (`TOWER_SPEC.outerDiameter`, stages.ts:175). Rim torus: Ø19.8 centreline, 0.1 tube, +0.08. Pitch 35° (`POD.solarPitchDeg`). Pitched centre height = columnTop + sin(35°) · 5 · 0.35 + 0.4 (stages.ts:363), so 3.80 live, 5.00 excavate, 29.50 for the 7-floor tower. Flat centre 0.09 |
| Slab | Ø20 × 0.22 (`OUTER_R`, `SLAB_H`), bottom at i × 3.5. Elevator hole Ø3.1 (`CORE_D + 0.1`). Stair cut: annular sector r 8.9–10.0 (`STAIR_R ± TREAD_RADIAL/2`), half-angle 13.32° (`STAIR_CUT_HALF`), centred at door − 6.28° − 13.32° |
| Landing | The uncut slab in front of the door is the landing (stages.ts:2118). Gate half-angle 6.28° = atan(1.1 / 10) from `LANDING_CLEAR_W = 2.2` |
| Balcony rail | Posts 0.04 × 1.1 × 0.04 on r = 10, 32 around (skipping the gate), top rail 0.05 × 0.05 chords. Floor 0 gets the two gate newels only |
| Elevator | Shell r 1.5, 0.1 thick, 3.1 high per floor (`roomH`). Door 0.9 × 1.985 at 210° + i · 45°, snapped to 96 wall segments: 191.25°–228.75° on floor 0. Leaf: arc at r 1.52, 0.035 thick, slid 95 % into the pocket |
| Walls | Facade r 7.5 × 0.14. Corridor r 3.25 × 0.08. Partitions 0.08. Room height 3.1. Facade runs to the next slab underside (3.28) on mid floors and to 2.852 (`roomH · 0.92`) on the top floor. Doors 0.885 / 1.01 (bath) / 1.77 (main) × 1.985. Windows 1.13 × 1.40, sill 0.90 |
| Room layout | Bedroom −45°…+45°, living +45°…119.5°, four 45° small rooms 119.5°…299.5° (floor 0, all rotated i · 45°). Tangent walls from the facade to the Ø3 core (lean-away, contact ±123.5°) |
| Stair | Centreline r 9.45 (`OUTER_R − 0.55`), treads 0.28 run × 0.05 × 1.1 radial, riser 0.1458 (3.5 / 24), 24 treads per floor spread over 45° − 2 × 6.28° (1.352° each). Rails at r 10.0 and 8.85, 1.1 high |
| Bridge | Deck 1.5 wide × 0.28, top at 0.34, from r 0.6 (excavate) or 7.45 (tower) out to 12.8, with 2 × 5 posts 0.08 × 0.95 |
| Berm | Torus centreline r 12.7, tube 2.2 flattened to 70 %, centre at 0.605 |
| Agrokruh | Beds Ø22 × 0.18 on a 24 m hex lattice (rings 1 + 2 = 18 beds), crop pad Ø21.2 × 0.35, pivot Ø0.22 × 1.1. Arm: mast Ø0.28 × 1.5, boom 0.32 × 0.22 × 10.835, head 0.55 × 0.4 × 0.65, wheel Ø1.1 × 0.16 on the rim, drop Ø0.14 |

## What is simplified compared with the game

- **Materials, colours, labels, lighting, animation and collision stay in code.** Parts are only named
  (Slab 0, Facade 0, Stair tread 0, …).
- **Static poses.** Door leaves use the fixed open angles from the code. The elevator leaf is in its
  pocket-open pose. Agrokruh arms point along `Arm yaw`, while the app spins them at runtime from a seeded random start angle.
- **Top-floor roof clipping.** The code clips top-floor walls to the pitched solar underside
  (`ceilingAt`) and adds a ribbon wall up to the roof (`buildPitchedWallInfill`). Here, walls are flat-topped
  and the infill ribbon is left out.
- **True curves.** The code builds walls from 96 flat panels and door leaves from 14. Here they are real
  cylinders and arcs. Openings still snap to the same 96-segment angles, so cut positions match.
- **Overlaps are kept.** As in the code, frames, leaves, tangent walls and rings overlap each other as
  separate parts. Nothing is merged.
- **Not modelled:** Agrokruh trees and shrubs (seeded random), the lattice yaw (`h3AgroYaw(cell)` depends on the H3 cell; set
  `Lattice yaw` by hand), which beds get the 6 arms (a seeded shuffle; here the first N beds get them), the gantry
  construction animation (slip form, crane, deck spokes), the zero-thickness below-grade pit wall of stage rise-1,
  terrain/pit carving, the floor grid lines, the LOD tower, and the digout basement scene (`digout.ts`, which is just boxes for a
  cut-scene and has no container or solar array).

## Values that are not in the code

- `ShippingContainer › Hollow shell` uses `POD.wall = 0.08`. The constant is declared in placements.ts, but no mesh uses it (the
  app draws a solid box). The option is off by default.
- `FloorSlab › Split landing` is only a visual split. The code has no separate landing solid. The split sector runs from
  the facade radius (7.5) to the slab edge (10) across ± the gate half-angle.
- The slab's stair cutter overshoots the slab edge by 0.05 m. This only avoids a coincident edge and doesn't change the result.

## Notes for editing

All files share the same `af*` helper functions. If you change a helper, change it in every file, or
paste the edited Tower.fs helpers into the others.
