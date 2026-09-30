FeatureScript 2960;
import(path : "onshape/std/geometry.fs", version : "2960.0");

// Aftermath pod container: vertical ISO 40 ft container (buildVerticalContainer, stages.ts:225).
// Babylon box {width: POD.width, height: POD.length, depth: POD.height}; Onshape X = width, Y = depth, Z = length.
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
// Pod builders: container, column + console, solar disc, bridge beam, berm
// ===========================================================================

/**
 * Vertical ISO container: buildVerticalContainer (stages.ts:225).
 * Babylon box { width: POD.width, height: POD.length, depth: POD.height } centred at bottomY + length / 2.
 */
function afBuildContainer(context is Context, hid is Id, bottomZ is ValueWithUnits, length is ValueWithUnits,
    width is ValueWithUnits, depth is ValueWithUnits, hollow is boolean, wallT is ValueWithUnits, techDetails is boolean)
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

annotation { "Feature Type Name" : "Aftermath pod container" }
export const aftermathShippingContainer = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        // placements.ts:18 POD.length
        annotation { "Name" : "Length (vertical)" }
        isLength(definition.length, { (meter) : [0.1, 12.192, 100] } as LengthBoundSpec);
        // placements.ts:19 POD.width
        annotation { "Name" : "Width (X)" }
        isLength(definition.width, { (meter) : [0.1, 2.438, 100] } as LengthBoundSpec);
        // placements.ts:21 POD.height (depth when stood on end)
        annotation { "Name" : "Depth (Y)" }
        isLength(definition.depth, { (meter) : [0.1, 2.591, 100] } as LengthBoundSpec);
        // stages.ts:473 topY = -POD.buryDepth (placements.ts:23). Pit stages: -13 + 12.192 = -0.808
        annotation { "Name" : "Top of container (Z)" }
        isLength(definition.topZ, { (meter) : [-100, -1, 100] } as LengthBoundSpec);
        // placements.ts:22 POD.wall; the app renders a solid box
        annotation { "Name" : "Hollow shell (uses POD.wall)", "Default" : false }
        definition.hollow is boolean;
        // placements.ts:22 POD.wall
        annotation { "Name" : "Wall thickness" }
        isLength(definition.wallT, { (meter) : [0.001, 0.08, 1] } as LengthBoundSpec);
        // stages.ts:619-640
        annotation { "Name" : "Tech door + racks (gantry stage)", "Default" : false }
        definition.techDetails is boolean;
    }
    {
        afBuildContainer(context, id + "container", definition.topZ - definition.length, definition.length,
            definition.width, definition.depth, definition.hollow, definition.wallT, definition.techDetails);
    });
