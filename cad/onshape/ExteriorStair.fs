FeatureScript 2960;
import(path : "onshape/std/geometry.fs", version : "2960.0");

// Aftermath exterior wrap stair: helical flight on the balcony ring, 24 risers per 3.5 m floor, 45 deg of arc per floor.
// Source: flightAngles (stages.ts:2136), buildFlight (stages.ts:2719).
// Generated for cad/onshape in the Aftermath repo. Paste the whole file into a new Feature Studio.
// Units: every code value is in meters (the app's unit) and is written here as "* meter".
// ===========================================================================
// Source constants from Martin's Aftermath/Arbolis Babylon.js app (meters, radians).
// Paths are relative to the repo root. Line numbers refer to the working tree on 2026-09-28.
// ===========================================================================

// --- apps/web/src/placements.ts : POD (vertical ISO 40 ft container + column) ---
const POD_LENGTH = 12.192 * meter;            // placements.ts:18  POD.length (vertical extent, stood on end)
const POD_WIDTH = 2.438 * meter;              // placements.ts:19  POD.width  (Babylon X)
const POD_HEIGHT = 2.591 * meter;             // placements.ts:21  POD.height (Babylon Z "depth" when vertical)
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
const CORE_WALL_T = 0.1 * meter;              // stages.ts:2233 elevator shell depth
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

annotation { "Feature Type Name" : "Aftermath exterior stair" }
export const aftermathExteriorStair = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        // flight i runs from slab i to slab i + 1 (stages.ts:3062-3066)
        annotation { "Name" : "From floor index" }
        isInteger(definition.fromFloor, { (unitless) : [0, 0, 100] } as IntegerBoundSpec);
        // tower-full has floors - 1 = 6 flights
        annotation { "Name" : "Number of flights" }
        isInteger(definition.flightCount, { (unitless) : [1, 1, 100] } as IntegerBoundSpec);
        // stages.ts:66 OUTER_R * 2 (RAIL_R_OUT = OUTER_R)
        annotation { "Name" : "Slab diameter" }
        isLength(definition.slabDiameter, { (meter) : [1, 20, 500] } as LengthBoundSpec);
        // placements.ts:39 TOWER_SPEC.floorH
        annotation { "Name" : "Floor height" }
        isLength(definition.floorHeight, { (meter) : [0.5, 3.5, 50] } as LengthBoundSpec);
        // stages.ts:2120 SLAB_H (flight starts on slab top)
        annotation { "Name" : "Slab thickness" }
        isLength(definition.slabThickness, { (meter) : [0, 0.22, 5] } as LengthBoundSpec);
        // stages.ts:2117 STAIR_R = OUTER_R - 0.55
        annotation { "Name" : "Stair centreline inset from slab edge" }
        isLength(definition.stairInset, { (meter) : [0, 0.55, 10] } as LengthBoundSpec);
        // stages.ts:2121 TREAD_RADIAL
        annotation { "Name" : "Tread radial width" }
        isLength(definition.treadRadial, { (meter) : [0.1, 1.1, 10] } as LengthBoundSpec);
        // stages.ts:2119 RISER = FH / 24
        annotation { "Name" : "Risers per floor" }
        isInteger(definition.risersPerFloor, { (unitless) : [1, 24, 200] } as IntegerBoundSpec);
        // stages.ts:2118 LANDING_CLEAR_W
        annotation { "Name" : "Landing (gate) clear width" }
        isLength(definition.landingClearW, { (meter) : [0.1, 2.2, 20] } as LengthBoundSpec);
        // stages.ts:2126 RAIL_H
        annotation { "Name" : "Rail height" }
        isLength(definition.railHeight, { (meter) : [0.1, 1.1, 5] } as LengthBoundSpec);
        // buildFlight rail blocks (stages.ts:2805-2909)
        annotation { "Name" : "Rails (posts + sloped top rails)", "Default" : true }
        definition.rails is boolean;
    }
    {
        var d = afDefaults();
        d.outerR = definition.slabDiameter / 2;
        d.floorH = definition.floorHeight;
        d.slabH = definition.slabThickness;
        d.stairInset = definition.stairInset;
        d.treadRadial = definition.treadRadial;
        d.risersPerFloor = definition.risersPerFloor;
        d.landingClearW = definition.landingClearW;
        d.railH = definition.railHeight;
        d = afDerive(d);
        for (var k = 0; k < definition.flightCount; k += 1)
        {
            const fi = definition.fromFloor + k;
            afBuildFlight(context, id + ("flight" ~ fi), d, fi, definition.rails);
        }
    });
