FeatureScript 2960;
import(path : "onshape/std/geometry.fs", version : "2960.0");

// Aftermath tower: one complete floor, and the full 7-floor tower with pod column and pitched solar roof.
// Source: buildRiseStage (stages.ts:2960) + everything it calls. Two features in one Feature Studio.
// Generated for cad/onshape in the Aftermath repo. Paste the whole file into a new Feature Studio.
// Units: every code value is in meters (the app's unit) and is written here as "* meter".
// ===========================================================================
// Source constants from Martin's Aftermath/Arbolis Babylon.js app (meters, radians).
// Paths are relative to the repo root. Line numbers refer to the working tree on 2026-09-28.
// ===========================================================================

// --- apps/web/src/placements.ts : POD (vertical ISO 40 ft container + column) ---
const POD_LENGTH = 12.192 * meter;            // placements.ts:18  POD.length (vertical extent, stood on end)
const POD_WIDTH = 2.438 * meter;              // placements.ts:19  POD.width  (Babylon X)
const POD_HEIGHT = 2.896 * meter;             // CAD: ISO 40 ft HC external height (game still uses 2.591 standard)
const POD_WALL = 0.08 * meter;                // placements.ts:22  POD.wall (declared, no mesh in the app uses it)
const POD_BURY_DEPTH = 1 * meter;             // placements.ts:23  POD.buryDepth (container top 1 m below grade)
const POD_TUBE_DIAMETER = 1 * meter;          // placements.ts:24  POD.tubeDiameter (column)
const POD_TUBE_ABOVE_GRADE = 2.4 * meter;     // placements.ts:26  POD.tubeHeightAboveGrade
const POD_CONSOLE_W = 0.55 * meter;           // placements.ts:27  POD.consoleW
const POD_CONSOLE_H = 1.1 * meter;            // placements.ts:28  POD.consoleH
const POD_CONSOLE_D = 0.28 * meter;           // placements.ts:29  POD.consoleD
const POD_SOLAR_PITCH = 35 * degree;          // placements.ts:32  POD.solarPitchDeg

// --- apps/web/src/placements.ts : TOWER_SPEC ---
const TOWER_INNER_D = 15 * meter;             // placements.ts:37  TOWER_SPEC.innerDiameter (facade)
const TOWER_OUTER_D = 20 * meter;             // placements.ts:38  TOWER_SPEC.outerDiameter (slab / solar disc)
const TOWER_FLOOR_H = 3.5 * meter;            // placements.ts:39  TOWER_SPEC.floorH
const TOWER_FLOORS_FULL = 7;                  // placements.ts:40  TOWER_SPEC.floorsFull

// --- apps/web/src/stages.ts ---
const EXCAVATE_DEPTH = 13 * meter;            // stages.ts:71   EXCAVATE_DEPTH (pit floor)
const BRIDGE_DECK_TOP = 0.34 * meter;         // stages.ts:286  BRIDGE_DECK_TOP
const BRIDGE_HALF_WIDTH = 0.75 * meter;       // stages.ts:287  BRIDGE_HALF_WIDTH
const BRIDGE_OUTER_EXTRA = 2.8 * meter;       // stages.ts:288  BRIDGE_OUTER_EXTRA
const BRIDGE_DECK_H = 0.28 * meter;           // stages.ts:305  deckH in buildBeamToColumn
const DOOR_WIDTH = 0.885 * meter;             // stages.ts:335  DOOR_WIDTH (single clear)
const DOOR_WIDTH_BATH = 1.01 * meter;         // stages.ts:337  DOOR_WIDTH_BATH
const DOOR_HEIGHT = 1.985 * meter;            // stages.ts:339  DOOR_HEIGHT
const DOOR_WIDTH_DOUBLE = 1.77 * meter;       // stages.ts:341  DOOR_WIDTH_DOUBLE (main entrance)
const WINDOW_WIDTH = 1.13 * meter;            // stages.ts:343  WINDOW_WIDTH
const WINDOW_HEIGHT = 1.40 * meter;           // stages.ts:345  WINDOW_HEIGHT
const WINDOW_SILL = 0.90 * meter;             // stages.ts:347  WINDOW_SILL
const OPEN_CORRIDOR = -1.2 * radian;          // stages.ts:349  OPEN_CORRIDOR (door swing)
const OPEN_FACADE = 1.2 * radian;             // stages.ts:351  OPEN_FACADE (door swing)
const SOLAR_DISC_T = 0.12 * meter;            // stages.ts:175  solar disc height
const SOLAR_RIM_INSET_D = 0.2 * meter;        // stages.ts:206  rim diameter = outerDiameter - 0.2
const SOLAR_RIM_T = 0.1 * meter;              // stages.ts:207  rim torus thickness
const SOLAR_RIM_Y = 0.08 * meter;             // stages.ts:216  rim offset above disc centre
const SOLAR_FLAT_Y = 0.09 * meter;            // stages.ts:185  flat disc centre height
const SOLAR_MOUNT_LIFT = 0.4 * meter;         // stages.ts:363  + 0.4 in mountPitchedSolarOnColumn
const SOLAR_MOUNT_FACTOR = 0.35;              // stages.ts:363  * 0.35 in mountPitchedSolarOnColumn
const EXCAVATE_COLUMN_TOP = POD_TUBE_ABOVE_GRADE + 1.2 * meter; // stages.ts:534
const BERM_TUBE = 2.2 * meter;                // stages.ts:515  berm torus thickness
const BERM_OFFSET = 1.6 * meter;              // stages.ts:519  diameter = (shaftR + 1.6 + tube/2) * 2
const BERM_SCALE_Y = 0.7;                     // stages.ts:529  berm.scaling.y
const WALL_SEGS = 96;                         // stages.ts:1268 WALL_SEGS (door/window cuts snap to these)
const CORE_D = 3 * meter;                     // stages.ts:2106 CORE_D (elevator core)
const INNER_WALL_D = 6.5 * meter;             // stages.ts:2107 INNER_WALL_D (corridor wall)
const STAIR_HAND = 1;                         // stages.ts:2112 STAIR_HAND (+1 = CCW ascending)
const ENTRANCE_ROT_PER_FLOOR = 45 * degree;   // stages.ts:2113 ENTRANCE_ROT_PER_FLOOR (PI / 4)
const STAIR_INSET = 0.55 * meter;             // stages.ts:2117 STAIR_R = OUTER_R - 0.55
const LANDING_CLEAR_W = 2.2 * meter;          // stages.ts:2118 LANDING_CLEAR_W
const RISERS_PER_FLOOR = 24;                  // stages.ts:2119 RISER = FH / 24
const SLAB_H = 0.22 * meter;                  // stages.ts:2120 SLAB_H
const TREAD_RADIAL = 1.1 * meter;             // stages.ts:2121 TREAD_RADIAL
const RAIL_H = 1.1 * meter;                   // stages.ts:2126 RAIL_H
const RAIL_POST = 0.04 * meter;               // stages.ts:2129 RAIL_POST
const RAIL_TOP = 0.05 * meter;                // stages.ts:2130 RAIL_TOP
const ROOM_H_MAX = 3.1 * meter;               // stages.ts:2189 roomH = min(FH - 0.4, 3.1)
const ROOM_H_GAP = 0.4 * meter;               // stages.ts:2189
const FACADE_TOP_FACTOR = 0.92;               // stages.ts:2190 facadeTop = roomH * 0.92
const FACADE_WALL_T = 0.14 * meter;           // stages.ts:2198 wallDepth (facade shell)
const PARTITION_T = 0.08 * meter;             // stages.ts:2199 partT (partitions, corridor shell)
const CORE_WALL_T = 0.15 * meter;             // mild CAD bump from game 0.1 (stages.ts:2233); continuous shell
const ELEV_DOOR_W = 0.9 * meter;              // stages.ts:2223 makeDoorCut(coreR, ELEV_ANG, 0.9, DOOR_HEIGHT)
const ELEV_ANG_OFFSET = 210 * degree;         // stages.ts:2222 ELEV_ANG = PI/2 + 2PI/3 + yaw
const SLAB_ELEV_CLEAR = 0.1 * meter;          // stages.ts:2665 slab hole diameter = CORE_D + 0.1
const TREAD_H = 0.05 * meter;                 // stages.ts:2729 treadH
const TREAD_MIN_RUN = 0.28 * meter;           // stages.ts:2738 run = max(0.28, chord * 1.2)
const TREAD_RUN_FACTOR = 1.2;                 // stages.ts:2738

// --- apps/web/src/stages.ts : Agrokruh ---
const AGRO_FARM_R = 60 * meter;               // stages.ts:3306 AGRO_FARM_R
const AGRO_BED_R = 11 * meter;                // stages.ts:3307 AGRO_BED_R (22 m discs)
const AGRO_PIVOT_SPACING = 24 * meter;        // stages.ts:3308 AGRO_PIVOT_SPACING
const AGRO_BED_H = 0.18 * meter;              // stages.ts:3315 AGRO_BED_H
const AGRO_CROP_H = 0.35 * meter;             // stages.ts:3316 AGRO_CROP_H
const AGRO_CROP_INSET = 0.8 * meter;          // stages.ts:3544 crop diameter = bed.r * 2 - 0.8
const AGRO_PIVOT_H = 1.1 * meter;             // stages.ts:3556 pivot post height
const AGRO_PIVOT_D = 0.22 * meter;            // stages.ts:3556 pivot post diameter
const AGRO_WHEEL_R = 0.55 * meter;            // stages.ts:3579 wheelR
const AGRO_BOOM_H = 1.5 * meter;              // stages.ts:3582 boomH
const AGRO_MAST_D = 0.28 * meter;             // stages.ts:3591 mast diameter
const AGRO_BOOM_W = 0.32 * meter;             // stages.ts:3603 boom width
const AGRO_BOOM_T = 0.22 * meter;             // stages.ts:3603 boom height
const AGRO_ARM_COUNT = 6;                     // stages.ts:3573 ARM_N = min(6, beds)

// ===========================================================================
// Axis mapping (Babylon is Y-up, Onshape is Z-up):
//   Babylon (x, y, z)  ->  Onshape (x, z, y)
//   Babylon +X (east)  =  Onshape +X
//   Babylon +Z (north) =  Onshape +Y
//   Babylon +Y (up)    =  Onshape +Z
// A plan angle `a` in the code (cos(a) * r, y, sin(a) * r) is the same angle in Onshape,
// measured from +X toward +Y (CCW seen from above). A Babylon `rotation.y = r` becomes an
// Onshape yaw of -r about +Z. Stage origin (tower axis at grade) = Onshape origin.
// ===========================================================================

/** 2D plan point (Onshape XY) at radius r and plan angle a. */
function afPolar(r is ValueWithUnits, a is ValueWithUnits) returns Vector
{
    return vector(r * cos(a), r * sin(a));
}

function afHypot(x is ValueWithUnits, y is ValueWithUnits) returns ValueWithUnits
{
    return sqrt(x * x + y * y);
}

/** Signed shortest angular difference a - b, wrapped to (-PI, PI]. Mirrors angNormDiff (stages.ts:2164). */
function afAngDiff(a is ValueWithUnits, b is ValueWithUnits) returns ValueWithUnits
{
    return atan2(sin(a - b), cos(a - b));
}

/** Math.sign(x || 1) for a plain number. */
function afSignOr1(x is number) returns number
{
    if (x < 0)
    {
        return -1;
    }
    return 1;
}

/** Floor yaw: STAIR_HAND * floorIndex * ENTRANCE_ROT_PER_FLOOR (stages.ts:2114). */
function afFloorYaw(floorIndex is number) returns ValueWithUnits
{
    return STAIR_HAND * floorIndex * ENTRANCE_ROT_PER_FLOOR;
}

/** Closed polygon (Onshape XY plan points) extruded vertically from zBot to zTop. */
function afPlanPrism(context is Context, hid is Id, pts is array, zBot is ValueWithUnits, zTop is ValueWithUnits) returns Query
{
    var loop = pts;
    loop = append(loop, pts[0]);
    const sketchId = hid + "sk";
    const sk = newSketchOnPlane(context, sketchId, {
                "sketchPlane" : plane(vector(0 * meter, 0 * meter, zBot), vector(0, 0, 1), vector(1, 0, 0))
            });
    skPolyline(sk, "loop", { "points" : loop });
    skSolve(sk);
    opExtrude(context, hid + "ex", {
                "entities" : qSketchRegion(sketchId),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : zTop - zBot
            });
    opDeleteBodies(context, hid + "del", { "entities" : qCreatedBy(sketchId, EntityType.BODY) });
    return qCreatedBy(hid + "ex", EntityType.BODY);
}

/**
 * Port of a Babylon MeshBuilder.CreateBox({ width: w, height: h, depth: d }) placed at
 * position (px, py, pz) with rotation.y = rotY, all in Babylon coordinates.
 * Local X (width) -> Onshape (cos r, -sin r); local Z (depth) -> Onshape (sin r, cos r); height -> Onshape Z.
 */
function afBabBox(context is Context, hid is Id, w is ValueWithUnits, h is ValueWithUnits, d is ValueWithUnits,
    px is ValueWithUnits, py is ValueWithUnits, pz is ValueWithUnits, rotY is ValueWithUnits) returns Query
{
    const c = cos(rotY);
    const s = sin(rotY);
    const ex = vector(c, -s) * (w / 2);
    const ez = vector(s, c) * (d / 2);
    const ctr = vector(px, pz);
    return afPlanPrism(context, hid, [ctr - ex - ez, ctr + ex - ez, ctr + ex + ez, ctr - ex + ez], py - h / 2, py + h / 2);
}

/** Vertical cylinder (Onshape Z axis) at plan point (cx, cy). */
function afCylZ(context is Context, hid is Id, cx is ValueWithUnits, cy is ValueWithUnits, r is ValueWithUnits,
    zBot is ValueWithUnits, zTop is ValueWithUnits) returns Query
{
    fCylinder(context, hid, {
                "bottomCenter" : vector(cx, cy, zBot),
                "topCenter" : vector(cx, cy, zTop),
                "radius" : r
            });
    return qCreatedBy(hid, EntityType.BODY);
}

/** Cylinder between two arbitrary 3D Onshape points. */
function afCylAxis(context is Context, hid is Id, p0 is Vector, p1 is Vector, r is ValueWithUnits) returns Query
{
    fCylinder(context, hid, { "bottomCenter" : p0, "topCenter" : p1, "radius" : r });
    return qCreatedBy(hid, EntityType.BODY);
}

/** Full ring (annulus) about the Onshape Z axis. */
function afRing(context is Context, hid is Id, rIn is ValueWithUnits, rOut is ValueWithUnits,
    zBot is ValueWithUnits, zTop is ValueWithUnits) returns Query
{
    const outer = afCylZ(context, hid + "o", 0 * meter, 0 * meter, rOut, zBot, zTop);
    const inner = afCylZ(context, hid + "i", 0 * meter, 0 * meter, rIn, zBot - 0.01 * meter, zTop + 0.01 * meter);
    opBoolean(context, hid + "cut", {
                "tools" : inner,
                "targets" : outer,
                "operationType" : BooleanOperationType.SUBTRACTION
            });
    return qCreatedBy(hid, EntityType.BODY);
}

/** Annular sector prism between plan angles a0 < a1 (span < 360 deg), rIn > 0. Mirrors createAnnularSectorMesh (stages.ts:2584). */
function afSector(context is Context, hid is Id, rIn is ValueWithUnits, rOut is ValueWithUnits,
    a0 is ValueWithUnits, a1 is ValueWithUnits, zBot is ValueWithUnits, zTop is ValueWithUnits) returns Query
{
    const am = (a0 + a1) / 2;
    const sketchId = hid + "sk";
    const sk = newSketchOnPlane(context, sketchId, {
                "sketchPlane" : plane(vector(0 * meter, 0 * meter, zBot), vector(0, 0, 1), vector(1, 0, 0))
            });
    skArc(sk, "outer", { "start" : afPolar(rOut, a0), "mid" : afPolar(rOut, am), "end" : afPolar(rOut, a1) });
    skLineSegment(sk, "end1", { "start" : afPolar(rOut, a1), "end" : afPolar(rIn, a1) });
    skArc(sk, "inner", { "start" : afPolar(rIn, a1), "mid" : afPolar(rIn, am), "end" : afPolar(rIn, a0) });
    skLineSegment(sk, "end0", { "start" : afPolar(rIn, a0), "end" : afPolar(rOut, a0) });
    skSolve(sk);
    opExtrude(context, hid + "ex", {
                "entities" : qSketchRegion(sketchId),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : zTop - zBot
            });
    opDeleteBodies(context, hid + "del", { "entities" : qCreatedBy(sketchId, EntityType.BODY) });
    return qCreatedBy(hid + "ex", EntityType.BODY);
}

/**
 * Straight box between two 3D Onshape points (square-ish cross-section w x h).
 * Used for sloped rail tops (placeRailTop, stages.ts:2773).
 */
function afSegmentBox(context is Context, hid is Id, a is Vector, b is Vector, w is ValueWithUnits, h is ValueWithUnits) returns Query
{
    const len = norm(b - a);
    const dir = normalize(b - a);
    var side = cross(vector(0, 0, 1), dir);
    if (norm(side) < 1e-9)
    {
        side = vector(1, 0, 0);
    }
    side = normalize(side);
    const up = cross(dir, side);
    fCuboid(context, hid + "box", {
                "corner1" : vector(-len / 2, -w / 2, -h / 2),
                "corner2" : vector(len / 2, w / 2, h / 2)
            });
    opTransform(context, hid + "move", {
                "bodies" : qCreatedBy(hid + "box", EntityType.BODY),
                "transform" : toWorld(coordSystem((a + b) / 2, dir, up))
            });
    return qCreatedBy(hid + "box", EntityType.BODY);
}

/**
 * Torus about the Onshape Z axis: ring radius R, tube semi-axes rRadial (horizontal) and
 * rVertical (vertical), tube centre at height zc. rVertical != rRadial reproduces a Babylon
 * torus with scaling.y (berm).
 */
function afTorusZ(context is Context, hid is Id, R is ValueWithUnits, rRadial is ValueWithUnits,
    rVertical is ValueWithUnits, zc is ValueWithUnits) returns Query
{
    const sketchId = hid + "sk";
    // Sketch plane = Onshape XZ half-plane: sketch x -> world +X, sketch y -> world +Z.
    const sk = newSketchOnPlane(context, sketchId, {
                "sketchPlane" : plane(vector(0 * meter, 0 * meter, 0 * meter), vector(0, -1, 0), vector(1, 0, 0))
            });
    if (abs(rRadial - rVertical) < 1e-6 * meter)
    {
        skCircle(sk, "tube", { "center" : vector(R, zc), "radius" : rRadial });
    }
    else if (rRadial > rVertical)
    {
        skEllipse(sk, "tube", { "center" : vector(R, zc), "majorRadius" : rRadial, "minorRadius" : rVertical, "majorAxis" : vector(1, 0) });
    }
    else
    {
        skEllipse(sk, "tube", { "center" : vector(R, zc), "majorRadius" : rVertical, "minorRadius" : rRadial, "majorAxis" : vector(0, 1) });
    }
    skSolve(sk);
    opRevolve(context, hid + "rev", {
                "entities" : qSketchRegion(sketchId),
                "axis" : line(vector(0, 0, 0) * meter, vector(0, 0, 1)),
                "angleForward" : 2 * PI * radian
            });
    opDeleteBodies(context, hid + "del", { "entities" : qCreatedBy(sketchId, EntityType.BODY) });
    return qCreatedBy(hid + "rev", EntityType.BODY);
}

/** Subtract a list of tool queries from targets (no-op when the list is empty). */
function afSubtract(context is Context, hid is Id, targets is Query, tools is array)
{
    if (size(tools) == 0)
    {
        return;
    }
    opBoolean(context, hid, {
                "tools" : qUnion(tools),
                "targets" : targets,
                "operationType" : BooleanOperationType.SUBTRACTION
            });
}

/** Name every body in the query (Parts list readability). */
function afName(context is Context, bodies is Query, name is string)
{
    setProperty(context, { "entities" : bodies, "propertyType" : PropertyType.NAME, "value" : name });
}

/** Angular half-width of a chord w on radius r: angHalf (stages.ts:1263). */
function afAngHalf(r is ValueWithUnits, w is ValueWithUnits) returns ValueWithUnits
{
    return atan2(w / 2, r);
}

/** snapOpeningToWallSegs (stages.ts:1270): widen to WALL_SEGS edges. */
function afSnapOut(a0 is ValueWithUnits, a1 is ValueWithUnits) returns map
{
    const step = 2 * PI / WALL_SEGS;
    const i0 = floor(a0 / radian / step + 1e-9);
    const i1 = ceil(a1 / radian / step - 1e-9);
    return { "a0" : i0 * step * radian, "a1" : max(i0 + 1, i1) * step * radian };
}

/** snapOpeningInward (stages.ts:1278): narrow to WALL_SEGS edges. */
function afSnapIn(a0 is ValueWithUnits, a1 is ValueWithUnits) returns map
{
    const step = 2 * PI / WALL_SEGS;
    const i0 = ceil(a0 / radian / step - 1e-9);
    const i1 = floor(a1 / radian / step + 1e-9);
    return { "a0" : i0 * step * radian, "a1" : max(i0 + 1, i1) * step * radian };
}

/** makeDoorCut (stages.ts:1297). h0/h1 are relative to the wall bottom. */
function afDoorCut(wallR is ValueWithUnits, midAng is ValueWithUnits, clearW is ValueWithUnits, clearH is ValueWithUnits) returns map
{
    const half = afAngHalf(wallR, clearW);
    const sn = afSnapOut(midAng - half, midAng + half);
    return { "a0" : sn.a0, "a1" : sn.a1, "h0" : 0 * meter, "h1" : clearH };
}

/** makeWindowCut (stages.ts:1312). */
function afWindowCut(wallR is ValueWithUnits, midAng is ValueWithUnits, clearW is ValueWithUnits, sill is ValueWithUnits, clearH is ValueWithUnits) returns map
{
    const half = afAngHalf(wallR, clearW);
    const step = 2 * PI / WALL_SEGS;
    const halfSegs = max(1, round(half / radian / step));
    const midI = round(midAng / radian / step);
    return { "a0" : (midI - halfSegs) * step * radian, "a1" : (midI + halfSegs) * step * radian, "h0" : sill, "h1" : sill + clearH };
}

/**
 * Cylindrical shell (radius wallR, thickness depth) from zBot to zTop with angular-sector cutouts.
 * Replaces buildPunchedCylinderWall (stages.ts:1427), which removes WALL_SEGS box panels whose
 * mid-angle lies in each opening. Openings are snapped to those segments, so a true sector cut is equivalent.
 */
function afPunchedShell(context is Context, hid is Id, wallR is ValueWithUnits, depth is ValueWithUnits,
    zBot is ValueWithUnits, zTop is ValueWithUnits, openings is array) returns Query
{
    const shell = afRing(context, hid + "ring", wallR - depth / 2, wallR + depth / 2, zBot, zTop);
    const H = zTop - zBot;
    var tools = [];
    for (var i = 0; i < size(openings); i += 1)
    {
        const op = openings[i];
        const lo = max(0 * meter, op.h0);
        const hi = min(H, op.h1);
        if (hi <= lo + 0.04 * meter)
        {
            continue;
        }
        var cz0 = zBot + lo;
        if (lo <= 0 * meter)
        {
            cz0 = zBot - 0.01 * meter;
        }
        var cz1 = zBot + hi;
        if (hi >= H)
        {
            cz1 = zTop + 0.01 * meter;
        }
        tools = append(tools, afSector(context, hid + ("op" ~ i), wallR - depth / 2 - 0.05 * meter, wallR + depth / 2 + 0.05 * meter,
                    op.a0, op.a1, cz0, cz1));
    }
    afSubtract(context, hid + "punch", shell, tools);
    return qCreatedBy(hid, EntityType.BODY);
}

/** Shared dimension set (defaults = code constants). Features override entries from their parameters. */
function afDefaults() returns map
{
    return {
            "outerR" : TOWER_OUTER_D / 2,          // stages.ts:66 OUTER_R (slab / balcony edge)
            "facadeR" : TOWER_INNER_D / 2,         // stages.ts:2109 FACADE_R = OUTER_WALL_D / 2
            "innerR" : INNER_WALL_D / 2,           // stages.ts:2196 innerR (corridor wall)
            "coreR" : CORE_D / 2,                  // stages.ts:2195 coreR (elevator)
            "floorH" : TOWER_FLOOR_H,
            "slabH" : SLAB_H,
            "facadeT" : FACADE_WALL_T,
            "partT" : PARTITION_T,
            "coreT" : CORE_WALL_T,
            "doorW" : DOOR_WIDTH,
            "doorWBath" : DOOR_WIDTH_BATH,
            "doorWDouble" : DOOR_WIDTH_DOUBLE,
            "doorH" : DOOR_HEIGHT,
            "elevDoorW" : ELEV_DOOR_W,
            "winW" : WINDOW_WIDTH,
            "winH" : WINDOW_HEIGHT,
            "winSill" : WINDOW_SILL,
            "stairInset" : STAIR_INSET,
            "treadRadial" : TREAD_RADIAL,
            "risersPerFloor" : RISERS_PER_FLOOR,
            "landingClearW" : LANDING_CLEAR_W,
            "railH" : RAIL_H
        };
}

/** Derived values, computed exactly as in stages.ts:2117-2133 and 2189-2191. */
function afDerive(d is map) returns map
{
    var e = d;
    e.stairR = e.outerR - e.stairInset;                               // STAIR_R
    e.riser = e.floorH / e.risersPerFloor;                            // RISER
    e.nRisers = round(e.floorH / e.riser);                            // flightAngles().nRisers
    e.stairCutHalf = 4 * atan2(e.treadRadial * 0.5, e.stairR);        // STAIR_CUT_HALF
    e.railROut = e.outerR;                                            // RAIL_R_OUT
    e.railRIn = e.stairR - e.treadRadial / 2 - 0.05 * meter;          // RAIL_R_IN
    e.gateHalf = atan2(e.landingClearW / 2, e.railROut);              // gateHalfAng()
    e.roomH = min(e.floorH - ROOM_H_GAP, ROOM_H_MAX);                 // roomH
    e.facadeTop = e.roomH * FACADE_TOP_FACTOR;                        // facadeTop
    return e;
}

// ===========================================================================
// Pod builders: container, column + console, solar disc, bridge beam, berm
// ===========================================================================

/**
 * Vertical ISO container: buildVerticalContainer (stages.ts:225).
 * Babylon box { width: POD.width, height: POD.length, depth: POD.height } centred at bottomY + length / 2.
 */
function afBuildContainer(context is Context, hid is Id, bottomZ is ValueWithUnits, length is ValueWithUnits,
    width is ValueWithUnits, depth is ValueWithUnits, hollow is boolean, wallT is ValueWithUnits, techDetails is boolean,
    isoCorners is boolean)
{
    const cz = bottomZ + length / 2;
    const boxBody = afBabBox(context, hid + "box", width, length, depth, 0 * meter, cz, 0 * meter, 0 * radian);
    if (hollow)
    {
        // Optional closed shell using POD.wall. The app renders a solid box.
        const voidBody = afBabBox(context, hid + "void", width - 2 * wallT, length - 2 * wallT, depth - 2 * wallT,
            0 * meter, cz, 0 * meter, 0 * radian);
        afSubtract(context, hid + "hollow", boxBody, [voidBody]);
    }
    afName(context, boxBody, "Pod container");
    if (isoCorners)
    {
        // ISO 1161 corner casting approx 178 × 162 × 118 mm. Container stood on end: length along Z.
        const cx = 0.178 * meter;
        const cy = 0.162 * meter;
        const czCast = 0.118 * meter;
        const xs = [-width / 2 + cx / 2, width / 2 - cx / 2];
        const ys = [-depth / 2 + cy / 2, depth / 2 - cy / 2];
        const zs = [bottomZ + czCast / 2, bottomZ + length - czCast / 2];
        var n = 0;
        for (var zi = 0; zi < 2; zi += 1)
        {
            for (var xi = 0; xi < 2; xi += 1)
            {
                for (var yi = 0; yi < 2; yi += 1)
                {
                    const cast = afBabBox(context, hid + ("cast" ~ n), cx, czCast, cy, xs[xi], zs[zi], ys[yi], 0 * radian);
                    afName(context, cast, "ISO corner " ~ n);
                    n += 1;
                }
            }
        }
    }
    if (techDetails)
    {
        // Gantry-stage tech container details, stages.ts:619-640 (children of the container, container-centred coords).
        const door = afBabBox(context, hid + "door", 1.1 * meter, 2.1 * meter, 0.06 * meter,
            0 * meter, cz + length / 2 - 1.4 * meter, depth / 2 + 0.02 * meter, 0 * radian);
        afName(context, door, "Tech door");
        for (var rack = 0; rack < 3; rack += 1)
        {
            const cab = afBabBox(context, hid + ("rack" ~ rack), 0.55 * meter, 1.8 * meter, 0.4 * meter,
                width / 2 + 0.22 * meter, cz + length / 2 - 2.4 * meter, -0.7 * meter + rack * 0.65 * meter, 0 * radian);
            afName(context, cab, "Tech rack " ~ rack);
        }
    }
}

/** buildColumnWithConsole (stages.ts:253): 1 m column from bottomZ to topZ, console at grade. */
function afBuildColumn(context is Context, hid is Id, bottomZ is ValueWithUnits, topZ is ValueWithUnits,
    tubeD is ValueWithUnits, withConsole is boolean)
{
    const tube = afCylZ(context, hid + "tube", 0 * meter, 0 * meter, tubeD / 2, bottomZ, topZ);
    afName(context, tube, "Hatch column");
    if (withConsole)
    {
        const con = afBabBox(context, hid + "console", POD_CONSOLE_W, POD_CONSOLE_H, POD_CONSOLE_D,
            tubeD * 0.55, POD_CONSOLE_H / 2, 0 * meter, 0 * radian);
        afName(context, con, "Pod console");
    }
}

/** Disc centre height for a pitched disc on a column: mountPitchedSolarOnColumn / pitchedDiscCenterY (stages.ts:363, 370). */
function afPitchedDiscCenterZ(columnTop is ValueWithUnits, diameter is ValueWithUnits, pitch is ValueWithUnits) returns ValueWithUnits
{
    return columnTop + sin(pitch) * (diameter / 4) * SOLAR_MOUNT_FACTOR + SOLAR_MOUNT_LIFT;
}

/**
 * Solar disc: buildSolarPanel (stages.ts:160). Built flat around the origin, then pitched about
 * Onshape +X (Babylon rotation.x = -pitch lifts the +Z/north edge = Onshape +Y edge) and moved to
 * (offsetX, 0, centerZ).
 */
function afBuildSolar(context is Context, hid is Id, diameter is ValueWithUnits, thickness is ValueWithUnits,
    pitch is ValueWithUnits, centerZ is ValueWithUnits, offsetX is ValueWithUnits, withRim is boolean, withConsole is boolean)
{
    const disc = afCylZ(context, hid + "disc", 0 * meter, 0 * meter, diameter / 2, -thickness / 2, thickness / 2);
    afName(context, disc, "Solar disc");
    if (withRim)
    {
        const rim = afTorusZ(context, hid + "rim", (diameter - SOLAR_RIM_INSET_D) / 2, SOLAR_RIM_T / 2, SOLAR_RIM_T / 2, SOLAR_RIM_Y);
        afName(context, rim, "Solar rim");
    }
    if (withConsole)
    {
        // stages.ts:189-198: console on the flat disc, child of the disc at y = 0.07 + consoleH / 2.
        const con = afBabBox(context, hid + "console", POD_CONSOLE_W, POD_CONSOLE_H, POD_CONSOLE_D,
            0 * meter, 0.07 * meter + POD_CONSOLE_H / 2, 0 * meter, 0 * radian);
        afName(context, con, "Roof console");
    }
    const place = transform(vector(offsetX, 0 * meter, centerZ)) *
        rotationAround(line(vector(0, 0, 0) * meter, vector(1, 0, 0)), pitch);
    opTransform(context, hid + "place", { "bodies" : qCreatedBy(hid, EntityType.BODY), "transform" : place });
}

/** buildBeamToColumn (stages.ts:290): timber bridge deck along Babylon +Z (Onshape +Y) with 2 x 5 posts. */
function afBuildBridge(context is Context, hid is Id, shaftR is ValueWithUnits, innerR is ValueWithUnits)
{
    const outerZ = shaftR + BRIDGE_OUTER_EXTRA;
    const innerZ = innerR;
    const span = outerZ - innerZ;
    const beam = afBabBox(context, hid + "deck", BRIDGE_HALF_WIDTH * 2, BRIDGE_DECK_H, span,
        0 * meter, BRIDGE_DECK_TOP - BRIDGE_DECK_H / 2, (outerZ + innerZ) / 2, 0 * radian);
    afName(context, beam, "Bridge deck");
    const sides = [-BRIDGE_HALF_WIDTH + 0.08 * meter, BRIDGE_HALF_WIDTH - 0.08 * meter];
    for (var si = 0; si < 2; si += 1)
    {
        for (var i = 0; i < 5; i += 1)
        {
            const post = afBabBox(context, hid + ("post" ~ si ~ "_" ~ i), 0.08 * meter, 0.95 * meter, 0.08 * meter,
                sides[si], BRIDGE_DECK_TOP + 0.4 * meter, innerZ + span * (i + 0.5) / 5, 0 * radian);
            afName(context, post, "Bridge post");
        }
    }
}

/** buildBerm (stages.ts:506): spoil torus, tube 2.2 m flattened to 70 %, resting at y = tube / 2 * 0.55. */
function afBuildBerm(context is Context, hid is Id, shaftR is ValueWithUnits)
{
    const R = shaftR + BERM_OFFSET + BERM_TUBE / 2;
    const berm = afTorusZ(context, hid + "torus", R, BERM_TUBE / 2, BERM_TUBE / 2 * BERM_SCALE_Y, BERM_TUBE / 2 * 0.55);
    afName(context, berm, "Spoil berm");
}

// ===========================================================================
// Floor slab: buildFloorSlab (stages.ts:2640) + balcony rail / gate newels (stages.ts:2490-2575)
// ===========================================================================

/**
 * One OUTER_R disc, SLAB_H thick, bottom at floorIndex * FH, minus the elevator hole (CORE_D + 0.1)
 * and the stair-width annular-sector cut placed clockwise of the door gate. The uncut slab in front
 * of the door IS the landing (stages.ts:2118, 2671-2672). Optionally split that landing zone into
 * its own part for visibility.
 */
function afBuildSlab(context is Context, hid is Id, d is map, floorIndex is number, splitLanding is boolean)
{
    const y0 = floorIndex * d.floorH;
    const yC = y0 + d.slabH / 2;
    const cutH = d.slabH * 1.25;                                     // stages.ts:2652
    const slab = afCylZ(context, hid + "disc", 0 * meter, 0 * meter, d.outerR, y0, y0 + d.slabH);
    const elev = afCylZ(context, hid + "elev", 0 * meter, 0 * meter, (2 * d.coreR + SLAB_ELEV_CLEAR) / 2, yC - cutH / 2, yC + cutH / 2);
    const mainAng = 90 * degree + afFloorYaw(floorIndex);            // stages.ts:2673
    const cutMid = mainAng - d.gateHalf - d.stairCutHalf;            // stages.ts:2676
    // rCutOut = STAIR_R + TREAD_RADIAL / 2 equals OUTER_R; +0.05 m overshoot avoids a coincident edge (same result).
    const stair = afSector(context, hid + "stair", d.stairR - d.treadRadial / 2, d.stairR + d.treadRadial / 2 + 0.05 * meter,
        cutMid - d.stairCutHalf, cutMid + d.stairCutHalf, yC - cutH / 2, yC + cutH / 2);
    afSubtract(context, hid + "cuts", slab, [elev, stair]);
    afName(context, slab, "Slab " ~ floorIndex);
    if (splitLanding)
    {
        // Visual split only: facade radius -> slab edge, +/- gateHalfAng() around the door (LANDING_CLEAR_W wide at RAIL_R_OUT).
        const landing = afSector(context, hid + "landing", d.facadeR, d.outerR, mainAng - d.gateHalf, mainAng + d.gateHalf, y0, y0 + d.slabH);
        opBoolean(context, hid + "split", {
                    "tools" : landing,
                    "targets" : slab,
                    "operationType" : BooleanOperationType.SUBTRACTION,
                    "keepTools" : true
                });
        afName(context, landing, "Landing " ~ floorIndex);
    }
}

/** Gate newels on every floor; full balcony ring (32 posts + top rail) above floor 0. y0 = slab top. */
function afBuildBalconyRail(context is Context, hid is Id, d is map, floorIndex is number, y0 is ValueWithUnits)
{
    const R = d.railROut;
    const mainAng = 90 * degree + afFloorYaw(floorIndex);
    const g = d.gateHalf;
    const aL = mainAng - STAIR_HAND * g;
    const aR = mainAng + STAIR_HAND * g;
    const newelL = afBabBox(context, hid + "gateL", RAIL_POST, d.railH, RAIL_POST, cos(aL) * R, y0 + d.railH / 2, sin(aL) * R, 0 * radian);
    const newelR = afBabBox(context, hid + "gateR", RAIL_POST, d.railH, RAIL_POST, cos(aR) * R, y0 + d.railH / 2, sin(aR) * R, 0 * radian);
    afName(context, qUnion([newelL, newelR]), "Gate newel " ~ floorIndex);
    if (floorIndex <= 0)
    {
        return;
    }
    var postAngs = [];
    for (var i = 0; i < 32; i += 1)
    {
        const a = (i / 32) * 2 * PI * radian;
        if (abs(afAngDiff(a, mainAng)) < g)
        {
            continue;
        }
        postAngs = append(postAngs, a);
        const post = afBabBox(context, hid + ("post" ~ i), RAIL_POST, d.railH, RAIL_POST, cos(a) * R, y0 + d.railH / 2, sin(a) * R, 0 * radian);
        afName(context, post, "Balcony post " ~ floorIndex);
    }
    const n = size(postAngs);
    for (var i = 0; i < n; i += 1)
    {
        const a0 = postAngs[i];
        const a1 = postAngs[(i + 1) % n];
        const span = afAngDiff(a1, a0);
        if (span <= 0.02 * radian || span > PI / 4 * radian)
        {
            continue;
        }
        afRailTopSeg(context, hid + ("top" ~ i), R, a0, a1, y0 + d.railH);
    }
    if (n > 0)
    {
        var bestToR = postAngs[0];
        var bestToL = postAngs[0];
        var dR = 1e9 * radian;
        var dL = 1e9 * radian;
        for (var i = 0; i < n; i += 1)
        {
            const a = postAngs[i];
            const towardFromR = STAIR_HAND * afAngDiff(a, aR);
            if (towardFromR > 0 * radian && towardFromR < dR)
            {
                dR = towardFromR;
                bestToR = a;
            }
            const towardToL = STAIR_HAND * afAngDiff(aL, a);
            if (towardToL > 0 * radian && towardToL < dL)
            {
                dL = towardToL;
                bestToL = a;
            }
        }
        if (dR < PI / 4 * radian)
        {
            afRailTopSeg(context, hid + "buttR", R, aR, bestToR, y0 + d.railH);
        }
        if (dL < PI / 4 * radian)
        {
            afRailTopSeg(context, hid + "buttL", R, bestToL, aL, y0 + d.railH);
        }
    }
}

/** placeTopSeg (stages.ts:2528): straight chord rail between two angles on radius R, centred at height yc. */
function afRailTopSeg(context is Context, hid is Id, R is ValueWithUnits, a0 is ValueWithUnits, a1 is ValueWithUnits, yc is ValueWithUnits)
{
    const span = afAngDiff(a1, a0);
    if (abs(span) <= 0.02 * radian || abs(span) > PI / 4 * radian)
    {
        return;
    }
    const mid = a0 + span / 2;
    const chord = 2 * R * sin(abs(span) / 2);
    const top = afBabBox(context, hid, chord, RAIL_TOP, RAIL_TOP, cos(mid) * R, yc, sin(mid) * R, -mid + 90 * degree);
    afName(context, top, "Balcony rail");
}

// ===========================================================================
// Elevator core: punched shell (stages.ts:2207-2251) + curved pocket door (buildCurvedElevatorDoor, stages.ts:1654)
// ===========================================================================

/**
 * Core shell of radius coreR, thickness coreT, from y0 (slab top) to y0 + coreH, with one door cut
 * at ELEV_ANG = 90 deg + 120 deg + floorYaw (120 deg right of the entrance). withDoor adds the frame,
 * the curved leaf slid into the pocket (static "open" pose from the code) and the track strip.
 */
function afBuildElevator(context is Context, hid is Id, d is map, floorIndex is number, y0 is ValueWithUnits,
    coreH is ValueWithUnits, withDoor is boolean)
{
    const r = d.coreR;
    const wallDepth = d.coreT;
    const elevAng = ELEV_ANG_OFFSET + afFloorYaw(floorIndex);
    const cut = afDoorCut(r, elevAng, d.elevDoorW, d.doorH);
    const shell = afPunchedShell(context, hid + "shell", r, wallDepth, y0, y0 + coreH, [cut]);
    afName(context, shell, "Elevator shell " ~ floorIndex);
    if (!withDoor)
    {
        return;
    }
    const angA = cut.a0;
    const angB = cut.a1;
    const doorH = cut.h1;
    const mid = (angA + angB) / 2;
    const clearW = 2 * r * sin((angB - angA) / 2);
    const thick = 0.06 * meter;
    const jambDepth = max(wallDepth + 0.04 * meter, 0.12 * meter);
    const rot = -mid + 90 * degree;
    const tx = -sin(mid);
    const tz = cos(mid);
    const rx = cos(mid);
    const rz = sin(mid);
    const half = clearW / 2;
    // placeFrame(n, w, h, d, along, yMid) -> box at (rx*r + tx*along, y0 + yMid, rz*r + tz*along), rotation.y = rot
    var frames = [];
    frames = append(frames, afBabBox(context, hid + "jambL", thick, doorH, jambDepth, rx * r + tx * (-(half - thick / 2)), y0 + doorH / 2, rz * r + tz * (-(half - thick / 2)), rot));
    frames = append(frames, afBabBox(context, hid + "jambR", thick, doorH, jambDepth, rx * r + tx * (half - thick / 2), y0 + doorH / 2, rz * r + tz * (half - thick / 2), rot));
    frames = append(frames, afBabBox(context, hid + "lintel", clearW, thick, jambDepth, rx * r, y0 + doorH - thick / 2, rz * r, rot));
    frames = append(frames, afBabBox(context, hid + "sill", clearW, 0.04 * meter, jambDepth, rx * r, y0 + 0.02 * meter, rz * r, rot));
    afName(context, qUnion(frames), "Elevator door frame " ~ floorIndex);
    // Curved leaf slid CCW into the wall pocket. The code builds 14 flat arc panels; this is the true arc.
    const leafArc = (angB - angA) * 0.95;
    const peek = 0.04 * radian;
    const leafA0 = angB - peek;
    const leafA1 = leafA0 + leafArc;
    const leafR = r + wallDepth * 0.2;
    const leafT = 0.035 * meter;
    const leaf = afSector(context, hid + "leaf", leafR - leafT / 2, leafR + leafT / 2, leafA0, leafA1,
        y0 + 0.03 * meter, y0 + doorH - 0.03 * meter);
    afName(context, leaf, "Elevator door leaf " ~ floorIndex);
    const trackR = r + wallDepth * 0.35;
    const track = afBabBox(context, hid + "track", 0.03 * meter, doorH - 0.08 * meter, wallDepth + 0.02 * meter,
        cos(angB) * trackR, y0 + doorH / 2, sin(angB) * trackR, -angB + 90 * degree);
    afName(context, track, "Elevator door track " ~ floorIndex);
}

// ===========================================================================
// Floor wall layout: buildFloorInterior (stages.ts:2179) and its wall helpers (stages.ts:1749-2068)
// ===========================================================================

/** coreTangentEnds (stages.ts:1749): outer-edge point P and core contact T of the lean-away tangent. */
function afCoreTangentEnds(edgeAng is ValueWithUnits, towardAng is ValueWithUnits, coreR is ValueWithUnits, outerR is ValueWithUnits) returns map
{
    const dlt = acos(min(1, max(-1, coreR / outerR)));
    const toMid = afAngDiff(towardAng, edgeAng);
    const phi = edgeAng - afSignOr1(toMid / radian) * dlt;
    const px = cos(edgeAng) * outerR;
    const pz = sin(edgeAng) * outerR;
    const tx = cos(phi) * coreR;
    const tz = sin(phi) * coreR;
    const span = afHypot(px - tx, pz - tz);
    var ux = 0;
    var uz = 0;
    if (span > 1e-6 * meter)
    {
        ux = (tx - px) / span;
        uz = (tz - pz) / span;
    }
    return { "px" : px, "pz" : pz, "tx" : tx, "tz" : tz, "span" : span, "ux" : ux, "uz" : uz, "phi" : phi };
}

/** sAtRadius (stages.ts:1788): sampled (41 steps, like the code) distance along P->T where |point| = targetR. */
function afSAtRadius(e is map, targetR is ValueWithUnits) returns ValueWithUnits
{
    var bestS = e.span * 0.5;
    var bestErr = 1e9 * meter;
    for (var k = 0; k <= 40; k += 1)
    {
        const s = (k / 40) * e.span;
        const err = abs(afHypot(e.px + e.ux * s, e.pz + e.uz * s) - targetR);
        if (err < bestErr)
        {
            bestErr = err;
            bestS = s;
        }
    }
    return bestS;
}

/** tangentInnerAng (stages.ts:1810). */
function afTangentInnerAng(edgeAng is ValueWithUnits, towardAng is ValueWithUnits, coreR is ValueWithUnits,
    innerR is ValueWithUnits, outerR is ValueWithUnits) returns ValueWithUnits
{
    const e = afCoreTangentEnds(edgeAng, towardAng, coreR, outerR);
    const s = afSAtRadius(e, innerR);
    return atan2(e.pz + e.uz * s, e.px + e.ux * s);
}

/** lineIntersect2 (stages.ts:1823). Returns undefined when parallel. */
function afLineIntersect(a0x, a0z, a1x, a1z, b0x, b0z, b1x, b1z)
{
    const den = (a0x - a1x) * (b0z - b1z) - (a0z - a1z) * (b0x - b1x);
    if (abs(den) < 1e-12 * meter * meter)
    {
        return undefined;
    }
    const t = ((a0x - b0x) * (b0z - b1z) - (a0z - b0z) * (b0x - b1x)) / den;
    return { "x" : a0x + t * (a1x - a0x), "z" : a0z + t * (a1z - a0z) };
}

/**
 * Wall box along a line in Babylon plan coordinates: from P + u*s0 to P + u*s1, thickness `thick`
 * centred on the line, from yBot to yTop. Equivalent to the code's local-frame boxes
 * (root at P, rotation.y = atan2(ux, uz), box depth along local +Z).
 */
function afLineBox(context is Context, hid is Id, px is ValueWithUnits, pz is ValueWithUnits, ux is number, uz is number,
    s0 is ValueWithUnits, s1 is ValueWithUnits, thick is ValueWithUnits, yBot is ValueWithUnits, yTop is ValueWithUnits) returns Query
{
    const u = vector(ux, uz);
    const n = vector(uz, -ux) * (thick / 2);
    const p = vector(px, pz);
    return afPlanPrism(context, hid, [p + u * s0 - n, p + u * s1 - n, p + u * s1 + n, p + u * s0 + n], yBot, yTop);
}

/** buildCoreTangentWall (stages.ts:1891). */
function afCoreTangentWall(context is Context, hid is Id, edgeAng is ValueWithUnits, towardAng is ValueWithUnits,
    coreR is ValueWithUnits, outerR is ValueWithUnits, y0 is ValueWithUnits, h is ValueWithUnits, thick is ValueWithUnits)
{
    const e = afCoreTangentEnds(edgeAng, towardAng, coreR, outerR);
    if (e.span < 0.2 * meter)
    {
        return;
    }
    const kiss = 0.025 * meter;
    const wall = afLineBox(context, hid, e.px, e.pz, e.ux, e.uz, 0 * meter, e.span + kiss, thick, y0, y0 + h);
    afName(context, wall, "Core tangent wall");
}

/** buildFacingInnerTangentWall (stages.ts:1837): bedroom|bath wall tangent to the corridor cylinder. */
function afFacingInnerTangentWall(context is Context, hid is Id, edgeA is ValueWithUnits, edgeB is ValueWithUnits,
    towardAng is ValueWithUnits, coreR is ValueWithUnits, innerR is ValueWithUnits, outerR is ValueWithUnits,
    y0 is ValueWithUnits, h is ValueWithUnits, thick is ValueWithUnits)
{
    const A = afCoreTangentEnds(edgeA, towardAng, coreR, outerR);
    const B = afCoreTangentEnds(edgeB, towardAng, coreR, outerR);
    const cx = cos(towardAng) * innerR;
    const cz = sin(towardAng) * innerR;
    const dx = -sin(towardAng);
    const dz = cos(towardAng);
    const far = 20 * meter;
    const hitA = afLineIntersect(A.px, A.pz, A.tx, A.tz, cx - dx * far, cz - dz * far, cx + dx * far, cz + dz * far);
    const hitB = afLineIntersect(B.px, B.pz, B.tx, B.tz, cx - dx * far, cz - dz * far, cx + dx * far, cz + dz * far);
    if (hitA == undefined || hitB == undefined)
    {
        return;
    }
    const span = afHypot(hitB.x - hitA.x, hitB.z - hitA.z);
    if (span < 0.2 * meter)
    {
        return;
    }
    const ux = (hitB.x - hitA.x) / span;
    const uz = (hitB.z - hitA.z) / span;
    const pad = 0.03 * meter;
    const wall = afLineBox(context, hid, hitA.x, hitA.z, ux, uz, -pad, span + pad, thick, y0, y0 + h);
    afName(context, wall, "Bedroom-bath wall");
}

/** Rotate a Babylon plan offset (x, z) by rotation.y = rho: x' = x cos + z sin, z' = -x sin + z cos. */
function afRotY(x is ValueWithUnits, z is ValueWithUnits, rho is ValueWithUnits) returns map
{
    return { "x" : x * cos(rho) + z * sin(rho), "z" : -x * sin(rho) + z * cos(rho) };
}

/**
 * buildLivingBedroomSeparator (stages.ts:1930): tangent wall at the bedroom/living edge with a bath door
 * and a bedroom door cut out. withFrames adds jambs, lintels and the two hinged leaves in their coded pose.
 */
function afSeparator(context is Context, hid is Id, d is map, edgeAng is ValueWithUnits, towardAng is ValueWithUnits,
    coreR is ValueWithUnits, innerR is ValueWithUnits, outerR is ValueWithUnits, y0 is ValueWithUnits,
    wallH is ValueWithUnits, thick is ValueWithUnits, doorH is ValueWithUnits, withFrames is boolean)
{
    const e = afCoreTangentEnds(edgeAng, towardAng, coreR, outerR);
    if (e.span < 0.5 * meter)
    {
        return;
    }
    const kiss = 0.025 * meter;
    const h = wallH;
    const rootRot = atan2(e.ux, e.uz);
    const ca = cos(towardAng);
    const sa = sin(towardAng);
    const denom = ca * e.ux + sa * e.uz;
    var sFace = e.span * 0.35;
    if (abs(denom) > 1e-8)
    {
        sFace = (innerR - (ca * e.px + sa * e.pz)) / denom;
    }
    const sFaceClamped = min(max(sFace, d.doorW + 0.2 * meter), e.span - d.doorW - 0.2 * meter);
    const half = d.doorW / 2;
    const roomSign = afSignOr1(e.uz * ca - e.ux * sa);
    const alongRight = -roomSign;
    const halfBath = d.doorWBath / 2;
    var sBath = min(e.span - halfBath - 0.08 * meter, max(sFaceClamped + halfBath + 0.1 * meter, (sFaceClamped + e.span) * 0.5));
    sBath = min(e.span - halfBath - 0.08 * meter, max(sFaceClamped + halfBath + 0.1 * meter, sBath + alongRight * 1.0 * meter));
    const sBed = max(half + 0.06 * meter, sFaceClamped * 0.5);
    var gaps = [
        { "s" : sBath, "tag" : "bath", "halfW" : halfBath, "hingeRight" : true },
        { "s" : sBed, "tag" : "bed", "halfW" : half, "hingeRight" : false }
    ];
    if (gaps[0].s > gaps[1].s)
    {
        gaps = [gaps[1], gaps[0]];
    }
    var pieces = [];
    var zCur = 0 * meter;
    for (var gi = 0; gi < 2; gi += 1)
    {
        const g = gaps[gi];
        const g0 = max(0 * meter, g.s - g.halfW);
        const g1 = min(e.span, g.s + g.halfW);
        if (g0 > zCur + 0.02 * meter)
        {
            pieces = append(pieces, afLineBox(context, hid + ("panel" ~ gi), e.px, e.pz, e.ux, e.uz, zCur, g0, thick, y0, y0 + h));
        }
        if (g1 > g0 + 0.02 * meter && h > doorH + 0.02 * meter)
        {
            pieces = append(pieces, afLineBox(context, hid + ("head" ~ gi), e.px, e.pz, e.ux, e.uz, g0, g1, thick, y0 + doorH, y0 + h));
        }
        if (withFrames)
        {
            const jambT = 0.06 * meter;
            const jambD = max(thick + 0.02 * meter, 0.1 * meter);
            var fr = [];
            fr = append(fr, afLineBox(context, hid + ("jambL" ~ gi), e.px, e.pz, e.ux, e.uz, g0, g0 + jambT, jambD, y0, y0 + doorH));
            fr = append(fr, afLineBox(context, hid + ("jambR" ~ gi), e.px, e.pz, e.ux, e.uz, g1 - jambT, g1, jambD, y0, y0 + doorH));
            const lintelLen = max(0.1 * meter, g1 - g0 - 0.02 * meter);
            fr = append(fr, afLineBox(context, hid + ("lintel" ~ gi), e.px, e.pz, e.ux, e.uz, (g0 + g1) / 2 - lintelLen / 2,
                        (g0 + g1) / 2 + lintelLen / 2, jambD, y0 + doorH, y0 + doorH + jambT));
            afName(context, qUnion(fr), "Separator door frame (" ~ g.tag ~ ")");
            // Hinge on the living face; stages.ts:2038-2063.
            const leafW = g.halfW * 2 - 0.04 * meter;
            var hingeAtHighS = false;
            if (g.hingeRight)
            {
                hingeAtHighS = alongRight > 0;
            }
            var hz = g0 + 0.02 * meter;
            if (g.hingeRight && hingeAtHighS)
            {
                hz = g1 - 0.02 * meter;
            }
            const hx = -roomSign * (thick / 2 + 0.01 * meter);
            var openRad = 1.2 * radian;
            var hingeSign = roomSign;
            if (g.tag == "bath")
            {
                openRad = 0.75 * radian;
                hingeSign = -roomSign;
            }
            const rhoH = hingeSign * openRad;
            var lz = leafW / 2;
            if (g.hingeRight && hingeAtHighS)
            {
                lz = -leafW / 2;
            }
            // leaf centre in root frame = hinge + Ry(rhoH) * (0, lz); then root -> world
            const inRoot = afRotY(0 * meter, lz, rhoH);
            const w = afRotY(hx + inRoot.x, hz + inRoot.z, rootRot);
            const leaf = afBabBox(context, hid + ("leaf" ~ gi), 0.04 * meter, doorH - 0.08 * meter, leafW,
                e.px + w.x, y0 + doorH / 2, e.pz + w.z, rootRot + rhoH);
            afName(context, leaf, "Separator door leaf (" ~ g.tag ~ ")");
        }
        zCur = g1;
    }
    if (e.span + kiss > zCur + 0.02 * meter)
    {
        pieces = append(pieces, afLineBox(context, hid + "panelEnd", e.px, e.pz, e.ux, e.uz, zCur, e.span + kiss, thick, y0, y0 + h));
    }
    afName(context, qUnion(pieces), "Living-bedroom separator");
}

/** buildRadialDemise (stages.ts:2302). */
function afRadialDemise(context is Context, hid is Id, ang is ValueWithUnits, r0 is ValueWithUnits, r1 is ValueWithUnits,
    y0 is ValueWithUnits, h is ValueWithUnits, thick is ValueWithUnits)
{
    const len = r1 - r0 + 0.04 * meter;
    const r = (r0 + r1) / 2;
    const wall = afBabBox(context, hid, thick, h, len, cos(ang) * r, y0 + h / 2, sin(ang) * r, -ang + 90 * degree);
    afName(context, wall, "Radial demise wall");
}

/** buildHingedDoor (stages.ts:1495): frame in a cylinder-wall cutout + one leaf at openRad. */
function afHingedDoor(context is Context, hid is Id, r is ValueWithUnits, angA is ValueWithUnits, angB is ValueWithUnits,
    y0 is ValueWithUnits, doorH is ValueWithUnits, wallDepth is ValueWithUnits, openRad is ValueWithUnits)
{
    const mid = (angA + angB) / 2;
    const clearW = 2 * r * sin((angB - angA) / 2);
    const thick = 0.07 * meter;
    const jambDepth = max(wallDepth + 0.06 * meter, 0.14 * meter);
    const rot = -mid + 90 * degree;
    const tx = -sin(mid);
    const tz = cos(mid);
    const rx = cos(mid);
    const rz = sin(mid);
    const half = clearW / 2;
    var fr = [];
    fr = append(fr, afBabBox(context, hid + "jambL", thick, doorH, jambDepth, rx * r + tx * (-(half - thick / 2)), y0 + doorH / 2, rz * r + tz * (-(half - thick / 2)), rot));
    fr = append(fr, afBabBox(context, hid + "jambR", thick, doorH, jambDepth, rx * r + tx * (half - thick / 2), y0 + doorH / 2, rz * r + tz * (half - thick / 2), rot));
    fr = append(fr, afBabBox(context, hid + "lintel", clearW, thick, jambDepth, rx * r, y0 + doorH - thick / 2, rz * r, rot));
    fr = append(fr, afBabBox(context, hid + "sill", clearW, 0.05 * meter, jambDepth + 0.02 * meter, rx * r, y0 + 0.025 * meter, rz * r, rot));
    afName(context, qUnion(fr), "Door frame");
    const leafClear = max(clearW - thick * 2, 0.35 * meter);
    const hingeAlong = -(half - thick - 0.01 * meter);
    const hxp = rx * r + tx * hingeAlong;
    const hzp = rz * r + tz * hingeAlong;
    const rho = rot + openRad;
    const leafW = max(leafClear - 0.02 * meter, 0.3 * meter);
    const off = afRotY(leafW / 2, 0 * meter, rho);
    const leaf = afBabBox(context, hid + "leaf", leafW, doorH - thick - 0.08 * meter, 0.04 * meter,
        hxp + off.x, y0 + doorH / 2, hzp + off.z, rho);
    afName(context, leaf, "Door leaf");
}

/** buildDoubleHingedDoor (stages.ts:1575): main entrance, two leaves on the outer jambs. */
function afDoubleDoor(context is Context, hid is Id, r is ValueWithUnits, angA is ValueWithUnits, angB is ValueWithUnits,
    y0 is ValueWithUnits, doorH is ValueWithUnits, wallDepth is ValueWithUnits, openRad is ValueWithUnits)
{
    const mid = (angA + angB) / 2;
    const clearW = 2 * r * sin((angB - angA) / 2);
    const thick = 0.08 * meter;
    const jambDepth = max(wallDepth + 0.06 * meter, 0.16 * meter);
    const rot = -mid + 90 * degree;
    const tx = -sin(mid);
    const tz = cos(mid);
    const rx = cos(mid);
    const rz = sin(mid);
    const half = clearW / 2;
    const gap = 0.02 * meter;
    const leafW = max((clearW - thick * 2 - gap) / 2 - 0.01 * meter, 0.3 * meter);
    var fr = [];
    fr = append(fr, afBabBox(context, hid + "jambL", thick, doorH, jambDepth, rx * r + tx * (-(half - thick / 2)), y0 + doorH / 2, rz * r + tz * (-(half - thick / 2)), rot));
    fr = append(fr, afBabBox(context, hid + "jambR", thick, doorH, jambDepth, rx * r + tx * (half - thick / 2), y0 + doorH / 2, rz * r + tz * (half - thick / 2), rot));
    fr = append(fr, afBabBox(context, hid + "lintel", clearW, thick, jambDepth, rx * r, y0 + doorH - thick / 2, rz * r, rot));
    fr = append(fr, afBabBox(context, hid + "sill", clearW, 0.06 * meter, jambDepth + 0.04 * meter, rx * r, y0 + 0.03 * meter, rz * r, rot));
    afName(context, qUnion(fr), "Main door frame");
    const sides = [-1, 1];
    for (var k = 0; k < 2; k += 1)
    {
        const side = sides[k];
        const hingeAlong = side * (half - thick - 0.01 * meter);
        const hxp = rx * r + tx * hingeAlong;
        const hzp = rz * r + tz * hingeAlong;
        var swing = -openRad;
        if (side < 0)
        {
            swing = openRad;
        }
        const rho = rot + swing;
        const off = afRotY(-side * (leafW / 2), 0 * meter, rho);
        const leaf = afBabBox(context, hid + ("leaf" ~ k), leafW, doorH - 0.06 * meter, 0.04 * meter,
            hxp + off.x, y0 + doorH / 2, hzp + off.z, rho);
        afName(context, leaf, "Main door leaf");
    }
}

/** buildFacadeWindow (stages.ts:1341): jambs, head, sill, mullion and a glass pane. */
function afFacadeWindow(context is Context, hid is Id, r is ValueWithUnits, angA is ValueWithUnits, angB is ValueWithUnits,
    y0 is ValueWithUnits, sill is ValueWithUnits, head is ValueWithUnits, wallDepth is ValueWithUnits)
{
    const mid = (angA + angB) / 2;
    const clearW = 2 * r * sin((angB - angA) / 2);
    const thick = 0.06 * meter;
    const jambDepth = max(wallDepth + 0.04 * meter, 0.12 * meter);
    const rot = -mid + 90 * degree;
    const tx = -sin(mid);
    const tz = cos(mid);
    const rx = cos(mid);
    const rz = sin(mid);
    const half = clearW / 2;
    const winH = head - sill;
    var fr = [];
    fr = append(fr, afBabBox(context, hid + "jambL", thick, winH, jambDepth, rx * r + tx * (-(half - thick / 2)), y0 + sill + winH / 2, rz * r + tz * (-(half - thick / 2)), rot));
    fr = append(fr, afBabBox(context, hid + "jambR", thick, winH, jambDepth, rx * r + tx * (half - thick / 2), y0 + sill + winH / 2, rz * r + tz * (half - thick / 2), rot));
    fr = append(fr, afBabBox(context, hid + "head", clearW, thick, jambDepth, rx * r, y0 + head - thick / 2, rz * r, rot));
    fr = append(fr, afBabBox(context, hid + "sill", clearW, 0.05 * meter, jambDepth + 0.02 * meter, rx * r, y0 + sill + 0.025 * meter, rz * r, rot));
    fr = append(fr, afBabBox(context, hid + "mullion", 0.04 * meter, winH - 0.08 * meter, 0.04 * meter, rx * r, y0 + sill + winH / 2, rz * r, rot));
    afName(context, qUnion(fr), "Window frame");
    const glassH = max(0.2 * meter, winH - thick - 0.08 * meter);
    const glassW = max(0.2 * meter, clearW - thick * 2 - 0.04 * meter);
    const glass = afBabBox(context, hid + "glass", glassW, glassH, 0.02 * meter, rx * r, y0 + sill + winH / 2, rz * r, rot);
    afName(context, glass, "Window glass");
}

/** equalFacadeMids (stages.ts:1329). */
function afEqualMids(a0 is ValueWithUnits, a1 is ValueWithUnits, n is number) returns array
{
    var mids = [];
    for (var i = 0; i < n; i += 1)
    {
        mids = append(mids, a0 + ((i + 0.5) / n) * (a1 - a0));
    }
    return mids;
}

/**
 * The whole floor wall layout (buildFloorInterior, stages.ts:2179) except the elevator core and
 * the rail (separate builders). y0 = interior floor (slab top). shellTopRel = facade shell height.
 * Top-floor pitched-roof clipping (ceilingAt) is not reproduced: walls are flat-topped.
 */
function afBuildFloorWalls(context is Context, hid is Id, d is map, floorIndex is number, y0 is ValueWithUnits,
    shellTopRel is ValueWithUnits, withFrames is boolean, withWindows is boolean, withFurniture is boolean)
{
    const wallH = d.roomH;                                   // stages.ts:2191
    const coreR = d.coreR;
    const innerR = d.innerR;
    const outerR = d.facadeR;
    const wallDepth = d.facadeT;
    const partT = d.partT;
    const doorH = d.doorH;
    const yaw = afFloorYaw(floorIndex);
    const mainAng = 90 * degree + yaw;
    const slice = 45 * degree;

    // Rooms (stages.ts:2262-2281): bedroom (2 slices), living (2 slices), 4 small rooms (1 slice each).
    const bedA0 = -45 * degree + yaw;
    const bedA1 = 45 * degree + yaw;
    const bedAmid = yaw;
    const innerA0 = afTangentInnerAng(bedA0, bedAmid, coreR, innerR, outerR);
    const innerA1 = afTangentInnerAng(bedA1, bedAmid, coreR, innerR, outerR);
    var firstSmallA0 = innerA0 - 4 * slice;
    if (firstSmallA0 < bedA1)
    {
        firstSmallA0 = firstSmallA0 + 2 * PI * radian;
    }
    const lastSmallA1 = firstSmallA0 + 4 * slice;
    var rooms = [
        { "a0" : bedA0, "a1" : bedA1, "role" : "bedroom" },
        { "a0" : bedA1, "a1" : firstSmallA0, "role" : "living" }
    ];
    for (var k = 0; k < 4; k += 1)
    {
        rooms = append(rooms, { "a0" : firstSmallA0 + k * slice, "a1" : firstSmallA0 + (k + 1) * slice, "role" : "small" });
    }
    var corridorOpenings = [];
    var facadeOpenings = [];

    // Partitions (stages.ts:2318-2338)
    afCoreTangentWall(context, hid + "tanA0", bedA0, bedAmid, coreR, outerR, y0, wallH, partT);
    afSeparator(context, hid + "sep", d, bedA1, bedAmid, coreR, innerR, outerR, y0, wallH, partT, doorH, withFrames);
    afFacingInnerTangentWall(context, hid + "bedBath", bedA0, bedA1, bedAmid, coreR, innerR, outerR, y0, wallH, partT);
    const arc = afSnapOut(innerA0, innerA1);
    corridorOpenings = append(corridorOpenings, { "a0" : arc.a0, "a1" : arc.a1, "h0" : 0 * meter, "h1" : wallH + 0.05 * meter });
    afRadialDemise(context, hid + "demiseLast", lastSmallA1, innerR, outerR, y0, wallH, partT);

    for (var i = 0; i < size(rooms); i += 1)
    {
        const room = rooms[i];
        const amid = (room.a0 + room.a1) / 2;
        const isLiving = room.role == "living";
        const isBedroom = room.role == "bedroom";
        const skipRadial = abs(afAngDiff(room.a0, bedA0)) < 1e-6 * radian || abs(afAngDiff(room.a0, bedA1)) < 1e-6 * radian;
        if (!skipRadial)
        {
            afRadialDemise(context, hid + ("demise" ~ i), room.a0, innerR, outerR, y0, wallH, partT);
        }
        if (isLiving)
        {
            const livingOpen = afSnapIn(innerA1, firstSmallA0);
            corridorOpenings = append(corridorOpenings, { "a0" : livingOpen.a0, "a1" : livingOpen.a1, "h0" : 0 * meter, "h1" : wallH + 0.05 * meter });
        }
        else if (!isBedroom)
        {
            const unitCut = afDoorCut(innerR, amid, d.doorW, doorH);
            if (withFrames)
            {
                afHingedDoor(context, hid + ("unitDoor" ~ i), innerR, unitCut.a0, unitCut.a1, y0, unitCut.h1, partT, OPEN_CORRIDOR);
            }
            corridorOpenings = append(corridorOpenings, unitCut);
        }

        // Facade openings (stages.ts:2371-2424)
        var nWin = 2;
        if (isLiving || isBedroom)
        {
            nWin = 3;
        }
        const slots = afEqualMids(room.a0, room.a1, nWin + 1);
        var preferDoor = amid;
        if (isLiving)
        {
            preferDoor = mainAng;
        }
        var doorIdx = 0;
        var best = 1e9 * radian;
        for (var s = 0; s < size(slots); s += 1)
        {
            const dd = abs(afAngDiff(slots[s], preferDoor));
            if (dd < best)
            {
                best = dd;
                doorIdx = s;
            }
        }
        const doorMid = slots[doorIdx];
        if (isLiving)
        {
            const mainCut = afDoorCut(outerR, mainAng, d.doorWDouble, doorH);
            if (withFrames)
            {
                afDoubleDoor(context, hid + "mainDoor", outerR, mainCut.a0, mainCut.a1, y0, mainCut.h1, wallDepth, OPEN_FACADE);
            }
            facadeOpenings = append(facadeOpenings, mainCut);
        }
        else
        {
            const balcCut = afDoorCut(outerR, doorMid, d.doorW, doorH);
            if (withFrames)
            {
                afHingedDoor(context, hid + ("balcDoor" ~ i), outerR, balcCut.a0, balcCut.a1, y0, balcCut.h1, wallDepth, OPEN_FACADE);
            }
            facadeOpenings = append(facadeOpenings, balcCut);
        }
        var wi = 0;
        for (var s = 0; s < size(slots); s += 1)
        {
            if (s == doorIdx)
            {
                continue;
            }
            var slot = slots[s];
            const mainHalf = afAngHalf(outerR, d.doorWDouble);
            if (isLiving && abs(afAngDiff(slot, mainAng)) < mainHalf + 0.05 * radian)
            {
                var sgn = -1;
                if (afAngDiff(slot, mainAng) >= 0 * radian)
                {
                    sgn = 1;
                }
                slot = mainAng + sgn * (mainHalf + 0.14 * radian);
            }
            const cut = afWindowCut(outerR, slot, d.winW, d.winSill, d.winH);
            if (withWindows)
            {
                afFacadeWindow(context, hid + ("win" ~ i ~ "_" ~ wi), outerR, cut.a0, cut.a1, y0, cut.h0, cut.h1, wallDepth);
            }
            wi += 1;
            facadeOpenings = append(facadeOpenings, cut);
        }

        if (withFurniture)
        {
            if (isBedroom)
            {
                const habR = (innerR + outerR) / 2;
                const bed = afBabBox(context, hid + ("bed" ~ i), 1.8 * meter, 0.4 * meter, 2.1 * meter,
                    cos(amid) * habR, y0 + 0.2 * meter, sin(amid) * habR, -amid + 90 * degree);
                afName(context, bed, "Bed (double)");
            }
            else if (room.role == "small")
            {
                const bedW = 1.0 * meter;
                const bedD = 2.0 * meter;
                const bedAng = room.a1 - afAngHalf(outerR, bedW) - 0.04 * radian;
                const bedR = outerR - wallDepth / 2 - bedD / 2 - 0.06 * meter;
                const bed = afBabBox(context, hid + ("bed" ~ i), bedW, 0.4 * meter, bedD,
                    cos(bedAng) * bedR, y0 + 0.2 * meter, sin(bedAng) * bedR, -bedAng + 90 * degree);
                afName(context, bed, "Bed (single)");
            }
        }
    }

    // Inner corridor cylinder (Ø6.5) and outer facade (Ø15), stages.ts:2461-2488
    const inner = afPunchedShell(context, hid + "innerShell", innerR, partT, y0, y0 + wallH, corridorOpenings);
    afName(context, inner, "Corridor wall " ~ floorIndex);
    const facade = afPunchedShell(context, hid + "facade", outerR, wallDepth, y0, y0 + shellTopRel, facadeOpenings);
    afName(context, facade, "Facade " ~ floorIndex);
}

// ===========================================================================
// Exterior wrap stair: flightAngles (stages.ts:2136) + buildFlight (stages.ts:2719)
// ===========================================================================

/** flightAngles (stages.ts:2136). */
function afFlightAngles(d is map, floorIndex is number) returns map
{
    const mainAng = 90 * degree + afFloorYaw(floorIndex);
    const clear = d.gateHalf;
    const startAng = mainAng + STAIR_HAND * clear;
    const endAng = mainAng + STAIR_HAND * ENTRANCE_ROT_PER_FLOOR - STAIR_HAND * clear;
    const nRisers = d.nRisers;
    const dAng = (endAng - startAng) / nRisers;
    const slabTop = floorIndex * d.floorH + d.slabH;
    return { "mainAng" : mainAng, "clear" : clear, "startAng" : startAng, "endAng" : endAng,
            "nRisers" : nRisers, "dAng" : dAng, "slabTop" : slabTop };
}

/**
 * Helical flight on the balcony ring from floor floorIndex to floorIndex + 1:
 * nRisers treads (run x TREAD_H x TREAD_RADIAL) centred on STAIR_R, each RISER higher,
 * skipping the door gate at both ends. withRails adds the outer (RAIL_R_OUT) and inner (RAIL_R_IN)
 * posts and sloped top rails.
 */
function afBuildFlight(context is Context, hid is Id, d is map, floorIndex is number, withRails is boolean)
{
    const fa = afFlightAngles(d, floorIndex);
    const slabTopY = fa.slabTop;
    const slabTopNext = slabTopY + d.floorH;
    const run = max(TREAD_MIN_RUN, 2 * d.stairR * sin(abs(fa.dAng) / 2) * TREAD_RUN_FACTOR);
    var sampleAng = [];
    var sampleY = [];
    var treads = [];
    for (var s = 0; s < fa.nRisers; s += 1)
    {
        const mid = fa.startAng + fa.dAng * (s + 0.5);
        if (abs(afAngDiff(mid, fa.mainAng)) < fa.clear - 0.001 * radian)
        {
            continue;
        }
        const yTop = slabTopY + d.riser * (s + 1);
        treads = append(treads, afBabBox(context, hid + ("tread" ~ s), run, TREAD_H, d.treadRadial,
                    cos(mid) * d.stairR, yTop - TREAD_H / 2, sin(mid) * d.stairR, -mid + 90 * degree));
        sampleAng = append(sampleAng, mid);
        sampleY = append(sampleY, yTop);
    }
    afName(context, qUnion(treads), "Stair tread " ~ floorIndex);
    if (!withRails)
    {
        return;
    }
    const n = size(sampleAng);
    const radii = [d.railROut, d.railRIn];
    const tags = ["out", "in"];
    for (var ri = 0; ri < 2; ri += 1)
    {
        const R = radii[ri];
        const tg = tags[ri];
        var parts = [];
        if (ri == 1)
        {
            // Inner rail start/end posts stand on the slabs (stages.ts:2854-2865).
            parts = append(parts, afBabBox(context, hid + "inPostStart", RAIL_POST, d.railH, RAIL_POST,
                        cos(fa.startAng) * R, slabTopY + d.railH / 2, sin(fa.startAng) * R, 0 * radian));
            parts = append(parts, afBabBox(context, hid + "inPostEnd", RAIL_POST, d.railH, RAIL_POST,
                        cos(fa.endAng) * R, slabTopNext + d.railH / 2, sin(fa.endAng) * R, 0 * radian));
        }
        for (var i = 0; i < n; i += 1)
        {
            parts = append(parts, afBabBox(context, hid + (tg ~ "Post" ~ i), RAIL_POST, d.railH, RAIL_POST,
                        cos(sampleAng[i]) * R, sampleY[i] + d.railH / 2, sin(sampleAng[i]) * R, 0 * radian));
        }
        if (n > 0)
        {
            // placeRailTop(a0, y0, r0, a1, y1, r1): Babylon (cos a * r, y, sin a * r) -> Onshape (cos a * r, sin a * r, y)
            var angs = [fa.startAng];
            var ys = [slabTopY + d.railH];
            for (var i = 0; i < n; i += 1)
            {
                angs = append(angs, sampleAng[i]);
                ys = append(ys, sampleY[i] + d.railH);
            }
            angs = append(angs, fa.endAng);
            ys = append(ys, slabTopNext + d.railH);
            for (var j = 0; j + 1 < size(angs); j += 1)
            {
                const pa = vector(cos(angs[j]) * R, sin(angs[j]) * R, ys[j]);
                const pb = vector(cos(angs[j + 1]) * R, sin(angs[j + 1]) * R, ys[j + 1]);
                if (norm(pb - pa) < 0.02 * meter)
                {
                    continue;
                }
                parts = append(parts, afSegmentBox(context, hid + (tg ~ "Top" ~ j), pa, pb, RAIL_TOP, RAIL_TOP));
            }
        }
        afName(context, qUnion(parts), "Stair rail " ~ tg ~ " " ~ floorIndex);
    }
}

/** One complete floor: slab, walls, elevator core, balcony rail and (optionally) the flight up to the next floor. */
function afBuildTowerFloor(context is Context, hid is Id, d is map, i is number, isTop is boolean, opts is map)
{
    const interiorY = i * d.floorH + d.slabH;             // stages.ts:3029
    afBuildSlab(context, hid + "slab", d, i, opts.splitLanding);
    var shellTopRel = d.floorH - d.slabH;                 // stages.ts:3032 next slab underside
    if (isTop)
    {
        shellTopRel = d.facadeTop;                        // stages.ts:2190 (pitched-roof infill above is omitted)
    }
    afBuildFloorWalls(context, hid + "walls", d, i, interiorY, shellTopRel, opts.frames, opts.windows, opts.furniture);
    afBuildElevator(context, hid + "elev", d, i, interiorY, d.roomH, opts.frames);
    if (opts.rail)
    {
        afBuildBalconyRail(context, hid + "rail", d, i, interiorY);
    }
    if (opts.flightUp)
    {
        afBuildFlight(context, hid + "flight", d, i, opts.rail);
    }
}

annotation { "Feature Type Name" : "Aftermath tower floor" }
export const aftermathTowerFloor = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        // floor i: slab at i * FH, layout yawed i * 45 deg (stages.ts:2114)
        annotation { "Name" : "Floor index" }
        isInteger(definition.floorIndex, { (unitless) : [0, 0, 100] } as IntegerBoundSpec);
        // top floor facade = roomH * 0.92 (stages.ts:2190)
        annotation { "Name" : "Top floor", "Default" : false }
        definition.topFloor is boolean;
        // stages.ts:3064 (floors below the top)
        annotation { "Name" : "Stair flight up to next floor", "Default" : true }
        definition.flightUp is boolean;
        // stages.ts:2490-2575, 2805-2909
        annotation { "Name" : "Balcony + stair rails", "Default" : true }
        definition.rail is boolean;
        // stages.ts:1495, 1575, 1654, 1930
        annotation { "Name" : "Door frames, leaves, elevator door", "Default" : true }
        definition.frames is boolean;
        // stages.ts:1341
        annotation { "Name" : "Window frames + glass", "Default" : true }
        definition.windows is boolean;
        // stages.ts:2426-2455
        annotation { "Name" : "Beds", "Default" : false }
        definition.furniture is boolean;
        // visual only
        annotation { "Name" : "Split landing into its own part", "Default" : false }
        definition.splitLanding is boolean;
        // placements.ts:39 TOWER_SPEC.floorH
        annotation { "Name" : "Floor height" }
        isLength(definition.floorHeight, { (meter) : [0.5, 3.5, 50] } as LengthBoundSpec);
        // placements.ts:38 TOWER_SPEC.outerDiameter
        annotation { "Name" : "Slab diameter" }
        isLength(definition.slabDiameter, { (meter) : [1, 20, 500] } as LengthBoundSpec);
        // stages.ts:2120 SLAB_H
        annotation { "Name" : "Slab thickness" }
        isLength(definition.slabThickness, { (meter) : [0.01, 0.22, 5] } as LengthBoundSpec);
        // placements.ts:37 TOWER_SPEC.innerDiameter
        annotation { "Name" : "Facade diameter" }
        isLength(definition.facadeDiameter, { (meter) : [1, 15, 500] } as LengthBoundSpec);
        // stages.ts:2107 INNER_WALL_D
        annotation { "Name" : "Corridor wall diameter" }
        isLength(definition.innerWallDiameter, { (meter) : [0.5, 6.5, 500] } as LengthBoundSpec);
        // stages.ts:2106 CORE_D
        annotation { "Name" : "Elevator core diameter" }
        isLength(definition.coreDiameter, { (meter) : [0.1, 3, 50] } as LengthBoundSpec);
    }
    {
        var d = afDefaults();
        d.floorH = definition.floorHeight;
        d.outerR = definition.slabDiameter / 2;
        d.slabH = definition.slabThickness;
        d.facadeR = definition.facadeDiameter / 2;
        d.innerR = definition.innerWallDiameter / 2;
        d.coreR = definition.coreDiameter / 2;
        d = afDerive(d);
        afBuildTowerFloor(context, id + "floor", d, definition.floorIndex, definition.topFloor, {
                    "splitLanding" : definition.splitLanding, "frames" : definition.frames, "windows" : definition.windows,
                    "furniture" : definition.furniture, "rail" : definition.rail, "flightUp" : definition.flightUp && !definition.topFloor
                });
    });

annotation { "Feature Type Name" : "Aftermath tower" }
export const aftermathTower = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        // placements.ts:40 TOWER_SPEC.floorsFull
        annotation { "Name" : "Floors" }
        isInteger(definition.floors, { (unitless) : [1, 7, 50] } as IntegerBoundSpec);
        // buildRiseStage (stages.ts:2973-2975)
        annotation { "Name" : "Buried container + column + console", "Default" : true }
        definition.pod is boolean;
        // stages.ts:2977 mountPitchedSolarOnColumn(columnTop)
        annotation { "Name" : "Pitched solar roof disc", "Default" : true }
        definition.solar is boolean;
        // stages.ts:2981 buildBeamToColumn(shaftR, INNER_R - 0.05)
        annotation { "Name" : "Bridge beam to the entrance", "Default" : true }
        definition.bridge is boolean;
        // stages.ts:2490-2575, 2805-2909
        annotation { "Name" : "Balcony + stair rails (slow)", "Default" : false }
        definition.rail is boolean;
        // stages.ts:1495, 1575, 1654, 1930
        annotation { "Name" : "Door frames, leaves, elevator doors (slow)", "Default" : false }
        definition.frames is boolean;
        // stages.ts:1341
        annotation { "Name" : "Window frames + glass (slow)", "Default" : false }
        definition.windows is boolean;
        // stages.ts:2426-2455
        annotation { "Name" : "Beds", "Default" : false }
        definition.furniture is boolean;
        // placements.ts:39 TOWER_SPEC.floorH
        annotation { "Name" : "Floor height" }
        isLength(definition.floorHeight, { (meter) : [0.5, 3.5, 50] } as LengthBoundSpec);
        // placements.ts:38 TOWER_SPEC.outerDiameter
        annotation { "Name" : "Slab diameter" }
        isLength(definition.slabDiameter, { (meter) : [1, 20, 500] } as LengthBoundSpec);
        // stages.ts:2120 SLAB_H
        annotation { "Name" : "Slab thickness" }
        isLength(definition.slabThickness, { (meter) : [0.01, 0.22, 5] } as LengthBoundSpec);
        // placements.ts:37 TOWER_SPEC.innerDiameter
        annotation { "Name" : "Facade diameter" }
        isLength(definition.facadeDiameter, { (meter) : [1, 15, 500] } as LengthBoundSpec);
        // stages.ts:2107 INNER_WALL_D
        annotation { "Name" : "Corridor wall diameter" }
        isLength(definition.innerWallDiameter, { (meter) : [0.5, 6.5, 500] } as LengthBoundSpec);
        // stages.ts:2106 CORE_D
        annotation { "Name" : "Elevator core diameter" }
        isLength(definition.coreDiameter, { (meter) : [0.1, 3, 50] } as LengthBoundSpec);
    }
    {
        var d = afDefaults();
        d.floorH = definition.floorHeight;
        d.outerR = definition.slabDiameter / 2;
        d.slabH = definition.slabThickness;
        d.facadeR = definition.facadeDiameter / 2;
        d.innerR = definition.innerWallDiameter / 2;
        d.coreR = definition.coreDiameter / 2;
        d = afDerive(d);
        const n = definition.floors;
        const opts = { "splitLanding" : false, "frames" : definition.frames, "windows" : definition.windows,
                "furniture" : definition.furniture, "rail" : definition.rail };
        for (var i = 0; i < n; i += 1)
        {
            var o = opts;
            o.flightUp = i < n - 1;                                   // stages.ts:3064
            afBuildTowerFloor(context, id + ("floor" ~ i), d, i, i == n - 1, o);
        }
        const columnTop = EXCAVATE_COLUMN_TOP + n * d.floorH;         // stages.ts:2967
        if (definition.pod)
        {
            const containerBottom = -EXCAVATE_DEPTH;                  // stages.ts:2969
            afBuildContainer(context, id + "container", containerBottom, POD_LENGTH, POD_WIDTH, POD_HEIGHT, false, POD_WALL, false, true);
            afBuildColumn(context, id + "column", containerBottom + POD_LENGTH, columnTop, POD_TUBE_DIAMETER, true);
        }
        if (definition.solar)
        {
            afBuildSolar(context, id + "solar", TOWER_OUTER_D, SOLAR_DISC_T, POD_SOLAR_PITCH,
                afPitchedDiscCenterZ(columnTop, TOWER_OUTER_D, POD_SOLAR_PITCH), 0 * meter, true, false);
        }
        if (definition.bridge)
        {
            afBuildBridge(context, id + "bridge", d.outerR, d.facadeR - 0.05 * meter);   // INNER_R - 0.05
        }
    });

// ===========================================================================
// game-v0.3 additions: tower crown (top floor clipped to the pitched roof + infill ribbon + pod spine)
// and the cheap neighbour LOD tower. Same dims as the procedural code.
// ===========================================================================

const ROOF_CLEAR = 0.05 * meter;              // stages.ts:69   ROOF_CLEAR (gap under the pitched disc)
const INFILL_T = 0.14 * meter;                // stages.ts:408  buildPitchedWallInfill depth
const PIT_WALL_T = 0.02 * meter;              // stages.ts:1203 buildSolidWallBand is a zero-thickness tube; 20 mm here
const LOD_COLUMN_D = 0.55 * meter;            // stages.ts:2950 buildRiseStageLod stub diameter

/**
 * Solid above the pitched solar underside minus ROOF_CLEAR, i.e. ceilingAt (stages.ts:3009):
 * Babylon y = pitchedDiscCenterY(columnTop) + z * tan(pitch) - halfT * cos(pitch) - ROOF_CLEAR,
 * which in Onshape is Z = c + Y * tan(pitch) (north / +Y edge high).
 */
function afRoofCutter(context is Context, hid is Id, columnTop is ValueWithUnits) returns Query
{
    const pitch = POD_SOLAR_PITCH;
    const c = afPitchedDiscCenterZ(columnTop, TOWER_OUTER_D, pitch) - SOLAR_DISC_T / 2 * cos(pitch) - ROOF_CLEAR;
    fCuboid(context, hid + "box", { "corner1" : vector(-60, -60, 0) * meter, "corner2" : vector(60, 60, 120) * meter });
    opTransform(context, hid + "tilt", {
                "bodies" : qCreatedBy(hid + "box", EntityType.BODY),
                "transform" : transform(vector(0 * meter, 0 * meter, c)) *
                    rotationAround(line(vector(0, 0, 0) * meter, vector(1, 0, 0)), pitch)
            });
    return qCreatedBy(hid + "box", EntityType.BODY);
}

annotation { "Feature Type Name" : "Aftermath tower crown" }
export const aftermathTowerCrown = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        // The crown is the top floor (index floors - 1) of an N-floor tower plus its pod spine.
        annotation { "Name" : "Floors in the tower" }
        isInteger(definition.floors, { (unitless) : [1, 7, 50] } as IntegerBoundSpec);
        // rise-1 (stages.ts:2989): open pit, zero-thickness pit wall from -13 m to grade
        annotation { "Name" : "Open-pit wall (rise-1)", "Default" : false }
        definition.pitWall is boolean;
        annotation { "Name" : "Balcony rails", "Default" : true }
        definition.rail is boolean;
        annotation { "Name" : "Door frames, leaves, elevator door", "Default" : true }
        definition.frames is boolean;
        annotation { "Name" : "Window frames + glass", "Default" : true }
        definition.windows is boolean;
        annotation { "Name" : "Beds", "Default" : true }
        definition.furniture is boolean;
        annotation { "Name" : "Buried container + column + console", "Default" : true }
        definition.pod is boolean;
        annotation { "Name" : "Pitched solar roof disc", "Default" : true }
        definition.solar is boolean;
        annotation { "Name" : "Bridge beam to the entrance", "Default" : true }
        definition.bridge is boolean;
    }
    {
        var d = afDerive(afDefaults());
        const n = definition.floors;
        const top = n - 1;
        const columnTop = EXCAVATE_COLUMN_TOP + n * d.floorH;          // stages.ts:2967
        afBuildTowerFloor(context, id + "top", d, top, true, {
                    "splitLanding" : false, "frames" : definition.frames, "windows" : definition.windows,
                    "furniture" : definition.furniture, "rail" : definition.rail, "flightUp" : false
                });
        // ceilingAt clip of the top floor (code samples min heights; here a true plane).
        opBoolean(context, id + "roofClip", {
                    "tools" : afRoofCutter(context, id + "roofCut", columnTop),
                    "targets" : qCreatedBy(id + "top", EntityType.BODY),
                    "operationType" : BooleanOperationType.SUBTRACTION
                });
        // buildPitchedWallInfill (stages.ts:394): Ø15 ribbon from the top facade band up to the roof underside.
        const interiorY = top * d.floorH + d.slabH;
        const zBot = interiorY + d.facadeTop;
        afRing(context, id + "infill", d.facadeR - INFILL_T / 2, d.facadeR + INFILL_T / 2, zBot, zBot + 40 * meter);
        opBoolean(context, id + "infillClip", {
                    "tools" : afRoofCutter(context, id + "infillCut", columnTop),
                    "targets" : qCreatedBy(id + "infill", EntityType.BODY),
                    "operationType" : BooleanOperationType.SUBTRACTION
                });
        afName(context, qCreatedBy(id + "infill", EntityType.BODY), "Roof infill");
        if (definition.pitWall)
        {
            const pw = afRing(context, id + "pitWall", d.facadeR - PIT_WALL_T / 2, d.facadeR + PIT_WALL_T / 2, -EXCAVATE_DEPTH, 0 * meter);
            afName(context, pw, "Pit wall");
        }
        if (definition.pod)
        {
            const containerBottom = -EXCAVATE_DEPTH;
            afBuildContainer(context, id + "container", containerBottom, POD_LENGTH, POD_WIDTH, POD_HEIGHT, false, POD_WALL, false, true);
            afBuildColumn(context, id + "column", containerBottom + POD_LENGTH, columnTop, POD_TUBE_DIAMETER, true);
        }
        if (definition.solar)
        {
            afBuildSolar(context, id + "solar", TOWER_OUTER_D, SOLAR_DISC_T, POD_SOLAR_PITCH,
                afPitchedDiscCenterZ(columnTop, TOWER_OUTER_D, POD_SOLAR_PITCH), 0 * meter, true, false);
        }
        if (definition.bridge)
        {
            afBuildBridge(context, id + "bridge", d.outerR, d.facadeR - 0.05 * meter);
        }
    });

annotation { "Feature Type Name" : "Aftermath tower LOD" }
export const aftermathTowerLod = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        // buildRiseStageLod (stages.ts:2914): unpunched facade + slab discs + stub column + pitched solar
        annotation { "Name" : "Floors" }
        isInteger(definition.floors, { (unitless) : [1, 7, 50] } as IntegerBoundSpec);
    }
    {
        const d = afDerive(afDefaults());
        const n = definition.floors;
        const h = n * d.floorH;
        afName(context, afCylZ(context, id + "facade", 0 * meter, 0 * meter, d.facadeR, 0 * meter, h), "LOD facade");
        for (var i = 0; i <= n; i += 1)
        {
            afName(context, afCylZ(context, id + ("slab" ~ i), 0 * meter, 0 * meter, d.outerR, i * d.floorH, i * d.floorH + d.slabH), "LOD slab");
        }
        const columnTop = EXCAVATE_COLUMN_TOP + n * d.floorH;
        // stub: height columnTop + 0.4 centred at columnTop / 2
        afName(context, afCylZ(context, id + "stub", 0 * meter, 0 * meter, LOD_COLUMN_D / 2, -0.2 * meter, columnTop + 0.2 * meter), "LOD column");
        afBuildSolar(context, id + "solar", TOWER_OUTER_D, SOLAR_DISC_T, POD_SOLAR_PITCH,
            afPitchedDiscCenterZ(columnTop, TOWER_OUTER_D, POD_SOLAR_PITCH), 0 * meter, true, false);
    });
