FeatureScript 2960;
import(path : "onshape/std/geometry.fs", version : "2960.0");

// Aftermath part kits: one named part per procedural MeshBuilder piece that the game animates, toggles,
// scatters or poses at runtime (live pod, gantry build, Agrokruh arms / plants, crowd figures).
// Each part is modelled in the mesh's own Babylon-local frame (same dims as the code, centred, same axis);
// the game re-centres each part on its bounding box and keeps every transform / animation in code.
// Parts are laid out in a tray so the Part Studio is readable. Units: metres.
//
// Axis mapping (Babylon Y-up -> Onshape Z-up): (x, y, z) -> (x, z, y). Box width = X, height = Z, depth = Y.

// --- apps/web/src/placements.ts : POD ---
const POD_LENGTH = 12.192 * meter;            // placements.ts:18 POD.length
const POD_WIDTH = 2.438 * meter;              // placements.ts:19 POD.width
const POD_DEPTH = 2.591 * meter;              // placements.ts:21 POD.height (game value; CAD tower docs use HC 2.896)
const POD_TUBE_D = 1 * meter;                 // placements.ts:24 POD.tubeDiameter
const POD_TUBE_ABOVE_GRADE = 2.4 * meter;     // placements.ts:26
const POD_BURY = 1 * meter;                   // placements.ts:23
const CONSOLE_W = 0.55 * meter;               // placements.ts:27
const CONSOLE_H = 1.1 * meter;                // placements.ts:28
const CONSOLE_D = 0.28 * meter;               // placements.ts:29
const OUTER_D = 20 * meter;                   // placements.ts:38 TOWER_SPEC.outerDiameter
const FH = 3.5 * meter;                       // placements.ts:39
const EXCAVATE_DEPTH = 13 * meter;            // stages.ts EXCAVATE_DEPTH

function kName(context is Context, hid is Id, name is string)
{
    setProperty(context, { "entities" : qCreatedBy(hid, EntityType.BODY), "propertyType" : PropertyType.NAME, "value" : name });
}

/** Babylon CreateBox({ width: w, height: h, depth: d }) centred at Onshape point `at`. */
function kBox(context is Context, hid is Id, name is string, w is ValueWithUnits, h is ValueWithUnits, d is ValueWithUnits, at is Vector)
{
    fCuboid(context, hid, { "corner1" : at - vector(w / 2, d / 2, h / 2), "corner2" : at + vector(w / 2, d / 2, h / 2) });
    kName(context, hid, name);
}

/** Babylon CreateCylinder({ height: h, diameter: dia }) (axis = Babylon Y = Onshape Z), centred at `at`. */
function kCyl(context is Context, hid is Id, name is string, dia is ValueWithUnits, h is ValueWithUnits, at is Vector)
{
    fCylinder(context, hid, { "bottomCenter" : at - vector(0 * meter, 0 * meter, h / 2), "topCenter" : at + vector(0 * meter, 0 * meter, h / 2), "radius" : dia / 2 });
    kName(context, hid, name);
}

/** Babylon CreateCylinder({ height, diameterTop, diameterBottom }) centred at `at`. */
function kCone(context is Context, hid is Id, name is string, dTop is ValueWithUnits, dBottom is ValueWithUnits, h is ValueWithUnits, at is Vector)
{
    fCone(context, hid, {
                "bottomCenter" : at - vector(0 * meter, 0 * meter, h / 2), "topCenter" : at + vector(0 * meter, 0 * meter, h / 2),
                "bottomRadius" : dBottom / 2, "topRadius" : dTop / 2
            });
    kName(context, hid, name);
}

/** Babylon CreateSphere({ diameter }) centred at `at`. */
function kSphere(context is Context, hid is Id, name is string, dia is ValueWithUnits, at is Vector)
{
    // std fSphere takes a vertex query; fEllipsoid takes a point, so use it with equal radii.
    fEllipsoid(context, hid, { "center" : at, "radius" : vector(dia / 2, dia / 2, dia / 2) });
    kName(context, hid, name);
}

/** Babylon CreateTorus({ diameter: D, thickness: T }) (flat in Babylon XZ = Onshape XY), centred at `at`. */
function kTorus(context is Context, hid is Id, name is string, D is ValueWithUnits, T is ValueWithUnits, at is Vector)
{
    const sketchId = hid + "sk";
    const sk = newSketchOnPlane(context, sketchId, { "sketchPlane" : plane(at, vector(0, -1, 0), vector(1, 0, 0)) });
    skCircle(sk, "tube", { "center" : vector(D / 2, 0 * meter), "radius" : T / 2 });
    skSolve(sk);
    opRevolve(context, hid + "rev", {
                "entities" : qSketchRegion(sketchId),
                "axis" : line(at, vector(0, 0, 1)),
                "angleForward" : 2 * PI * radian
            });
    opDeleteBodies(context, hid + "del", { "entities" : qCreatedBy(sketchId, EntityType.BODY) });
    kName(context, hid + "rev", name);
}

/** CSG(outer cylinder - taller inner cylinder) as in the code: ring of height h centred at `at`. */
function kRing(context is Context, hid is Id, name is string, outerD is ValueWithUnits, innerD is ValueWithUnits, h is ValueWithUnits, at is Vector)
{
    fCylinder(context, hid + "o", { "bottomCenter" : at - vector(0 * meter, 0 * meter, h / 2), "topCenter" : at + vector(0 * meter, 0 * meter, h / 2), "radius" : outerD / 2 });
    fCylinder(context, hid + "i", { "bottomCenter" : at - vector(0 * meter, 0 * meter, h / 2 + 0.2 * meter), "topCenter" : at + vector(0 * meter, 0 * meter, h / 2 + 0.2 * meter), "radius" : innerD / 2 });
    opBoolean(context, hid + "cut", {
                "tools" : qCreatedBy(hid + "i", EntityType.BODY),
                "targets" : qCreatedBy(hid + "o", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
            });
    kName(context, hid + "o", name);
}

function kAt(x is number, y is number, z is number) returns Vector
{
    return vector(x, y, z) * meter;
}

annotation { "Feature Type Name" : "Aftermath live pod kit" }
export const aftermathLivePodKit = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        // buildBuriedPod (stages.ts:463) + live dig berm / beam (walk.ts). Laid out at their stage positions
        // (translation only); the solar disc is flat here because the game applies the 35 deg pitch.
        const topY = -POD_BURY;
        kBox(context, id + "container", "Live container", POD_WIDTH, POD_LENGTH, POD_DEPTH, vector(0 * meter, 0 * meter, topY - POD_LENGTH / 2));
        const colH = POD_TUBE_ABOVE_GRADE - topY;
        kCyl(context, id + "column", "Live column", POD_TUBE_D, colH, vector(0 * meter, 0 * meter, topY + colH / 2));
        kBox(context, id + "console", "Live console", CONSOLE_W, CONSOLE_H, CONSOLE_D, vector(POD_TUBE_D * 0.55, 0 * meter, CONSOLE_H / 2));
        // walk.ts solarPreview: Ø20 x 0.12, no rim, centre at columnTop + sin(35) * 5 * 0.35 + 0.4
        kCyl(context, id + "solar", "Live solar disc", OUTER_D, 0.12 * meter, kAt(0, 0, 2.4 + sin(35 * degree) * 5 * 0.35 + 0.4));
        // walk.ts digBerm: diameter digDiam + 5.5, thickness 2.2 (the game flattens it to 70 %)
        kTorus(context, id + "berm", "Live berm", OUTER_D + 5.5 * meter, 2.2 * meter, kAt(0, 0, 0.75));
        // walk.ts digBeam: 1.5 x 0.28 x (digDiam / 2 + 2.5)
        kBox(context, id + "beam", "Live dig beam", 1.5 * meter, 0.28 * meter, OUTER_D / 2 + 2.5 * meter, kAt(0, 6, 0.2));
    });

annotation { "Feature Type Name" : "Aftermath gantry kit" }
export const aftermathGantryKit = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        // buildGantryStage (stages.ts:568). Tray along Onshape X.
        const gantryFloors = 3;                                    // GANTRY_FLOORS
        const containerTop = -EXCAVATE_DEPTH + POD_LENGTH;
        const columnMeshH = gantryFloors * FH + 14 * meter - containerTop;
        kCyl(context, id + "column", "Build column", POD_TUBE_D, columnMeshH, kAt(0, 0, 0));
        kTorus(context, id + "berm", "Build berm", (OUTER_D / 2 + 3.6 * meter) * 2, 2.2 * meter, kAt(30, 0, 0));
        kBox(context, id + "container", "Tech container", POD_WIDTH, POD_LENGTH, POD_DEPTH, kAt(60, 0, 0));
        kBox(context, id + "door", "Tech door", 1.1 * meter, 2.1 * meter, 0.06 * meter, kAt(65, 0, 0));
        kBox(context, id + "rack", "Tech rack", 0.55 * meter, 1.8 * meter, 0.4 * meter, kAt(68, 0, 0));
        const beamR0 = POD_TUBE_D * 0.5 + 0.35 * meter;
        const beamR1 = OUTER_D / 2 - 0.35 * meter;
        const beamLen = beamR1 - beamR0;
        kCyl(context, id + "beam", "Deck beam", 0.34 * meter, beamLen, kAt(72, 0, 0));
        for (var r = 0; r < 5; r += 1)
        {
            const radius = beamR0 + ((r + 1) / 5) * beamLen;
            kTorus(context, id + ("ring" ~ r), "Deck ring " ~ r, radius * 2, 0.36 * meter, kAt(100, 0, 0) + vector(0 * meter, 0 * meter, r * 1 * meter));
        }
        const slabH = 0.28 * meter;
        kRing(context, id + "slab", "Deck slab", OUTER_D, POD_TUBE_D + 0.4 * meter, slabH, kAt(130, 0, 0));
        const shellInnerD = OUTER_D - 0.4 * meter * 2;             // OUTER_WALL_T = 0.4
        kRing(context, id + "slipWall", "Slip wall", OUTER_D, shellInnerD, gantryFloors * FH - slabH, kAt(160, 0, 0));
        kRing(context, id + "slipForm", "Slip form", OUTER_D + 0.16 * meter, shellInnerD - 0.12 * meter, 1.15 * meter, kAt(190, 0, 0));
        kRing(context, id + "baseWall", "Base wall", OUTER_D, shellInnerD, EXCAVATE_DEPTH, kAt(220, 0, 0));
        const boomLen = OUTER_D / 2 + 2 * meter;
        kCyl(context, id + "sleeve", "Gantry sleeve", POD_TUBE_D + 0.45 * meter, 1.5 * meter, kAt(250, 0, 0));
        kBox(context, id + "boom", "Gantry boom", boomLen, 0.32 * meter, 0.42 * meter, kAt(260, 0, 0));
        kBox(context, id + "trolley", "Gantry trolley", 0.7 * meter, 0.38 * meter, 0.55 * meter, kAt(270, 0, 0));
        kBox(context, id + "cabin", "Gantry cabin", 1.1 * meter, 1.1 * meter, 1.1 * meter, kAt(272, 0, 0));
        kTorus(context, id + "slew", "Gantry slew ring", POD_TUBE_D + 0.9 * meter, 0.18 * meter, kAt(275, 0, 0));
        kBox(context, id + "counter", "Gantry counterweight", 1.6 * meter, 0.7 * meter, 0.7 * meter, kAt(278, 0, 0));
        kBox(context, id + "hopper", "Gantry hopper", 0.9 * meter, 0.7 * meter, 0.9 * meter, kAt(281, 0, 0));
        kBox(context, id + "bucket", "Gantry bucket", 0.7 * meter, 0.45 * meter, 1.1 * meter, kAt(283, 0, 0));
        kCyl(context, id + "stream", "Gantry stream", 0.12 * meter, 1.4 * meter, kAt(285, 0, 0));
        kCyl(context, id + "roof", "Gantry roof disc", OUTER_D, 0.12 * meter, kAt(300, 0, 0));
    });

annotation { "Feature Type Name" : "Aftermath Agrokruh kit" }
export const aftermathAgroKit = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        // buildAgrokruh (stages.ts:3528). Plants at scale 1 (the game scales each copy by its seeded factor).
        const bedR = 11 * meter;                                   // AGRO_BED_R
        const wheelR = 0.55 * meter;
        const boomH = 1.5 * meter;
        kCyl(context, id + "soil", "Agro soil bed", bedR * 2, 0.18 * meter, kAt(0, 0, 0));
        kCyl(context, id + "crop", "Agro crop pad", bedR * 2 - 0.8 * meter, 0.35 * meter, kAt(25, 0, 0));
        kCyl(context, id + "pivot", "Agro pivot", 0.22 * meter, 1.1 * meter, kAt(40, 0, 0));
        kCyl(context, id + "mast", "Agro arm mast", 0.28 * meter, boomH, kAt(42, 0, 0));
        kBox(context, id + "boom", "Agro arm boom", 0.32 * meter, 0.22 * meter, max(0.5 * meter, bedR - wheelR * 0.3), kAt(44, 0, 0));
        kBox(context, id + "head", "Agro arm head", 0.55 * meter, 0.4 * meter, 0.65 * meter, kAt(46, 0, 0));
        kCyl(context, id + "wheel", "Agro arm wheel", wheelR * 2, 0.16 * meter, kAt(48, 0, 0));
        kCyl(context, id + "drop", "Agro arm drop", 0.14 * meter, max(0.2 * meter, boomH - wheelR), kAt(50, 0, 0));
        kCyl(context, id + "trunk", "Tree trunk", 0.22 * meter, 1.6 * meter, kAt(53, 0, 0));
        kSphere(context, id + "canopy", "Tree canopy", 2.5 * meter, kAt(56, 0, 0));
        kSphere(context, id + "shrub", "Shrub", 1.1 * meter, kAt(59, 0, 0));
        kSphere(context, id + "shrub2", "Shrub small", 0.75 * meter, kAt(61, 0, 0));
    });

annotation { "Feature Type Name" : "Aftermath crowd kit" }
export const aftermathCrowdKit = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        // buildSkeletonPerson (crowd.ts:231) at s = 1 (1.75 m figure); the game scales each figure.
        kSphere(context, id + "hip", "Person hip", 0.28 * meter, kAt(0, 0, 0));
        kCone(context, id + "torso", "Person torso", 0.26 * meter, 0.3 * meter, 0.38 * meter, kAt(0.5, 0, 0));
        kSphere(context, id + "chest", "Person chest", 0.32 * meter, kAt(1, 0, 0));
        kSphere(context, id + "head", "Person head", 0.22 * meter, kAt(1.5, 0, 0));
        kCyl(context, id + "upperArm", "Person upper arm", 0.07 * meter, 0.28 * meter, kAt(2, 0, 0));
        kCyl(context, id + "forearm", "Person forearm", 0.06 * meter, 0.26 * meter, kAt(2.3, 0, 0));
        kCyl(context, id + "thigh", "Person thigh", 0.1 * meter, 0.42 * meter, kAt(2.6, 0, 0));
        kCyl(context, id + "shin", "Person shin", 0.08 * meter, 0.4 * meter, kAt(2.9, 0, 0));
        kBox(context, id + "foot", "Person foot", 0.08 * meter, 0.05 * meter, 0.18 * meter, kAt(3.2, 0, 0));
    });
