#!/usr/bin/env node
/**
 * onshape-bootstrap: creates (or reuses) the Aftermath Onshape documents from cad/onshape/*.fs.
 *
 * For each target it will:
 *   1. find the document by exact name (owned by the key's user) or create it (public, in the folder if known)
 *   2. find/create a Feature Studio named after the .fs file and upload the FeatureScript. The first two
 *      lines (FeatureScript NNNN + std import) are replaced by the header Onshape generated for the new studio,
 *      as cad/onshape/README.md step 3 describes
 *   3. check the Feature Studio compiles (the feature spec is present) and report any notices
 *   4. add the custom feature to "Part Studio 1" with the given parameters (once) and check featureStatus
 *   5. create the named version (if it doesn't exist yet)
 * The ids are written to cad/onshape-docs.json (no secrets).
 *
 *   node scripts/onshape-bootstrap.mjs [--only <doc>] [--folder <folderId>] [--no-version] [--verbose]
 *
 * API (https://cad.onshape.com/glassworks/explorer/, guides at https://onshape-public.github.io/docs/):
 *   Document/createDocument, getDocuments, getVersions, createVersion, getElementsInDocument
 *   FeatureStudio/createFeatureStudio, getFeatureStudioContents, updateFeatureStudioContents, getFeatureStudioSpecs
 *   PartStudio/getPartStudioFeatures, addPartStudioFeature (https://onshape-public.github.io/docs/api-adv/featureaccess/)
 * Folders: the documented API cannot create folders. Either pass --folder <id> (from the folder URL in Onshape), or
 * --create-folders "Arbolis/Aftermath", which uses the UNDOCUMENTED `POST /api/folders` {name, parentId, ownerType, ownerId}
 * (community-reported: https://forum.onshape.com/discussion/25075). It may change without notice. Folder ids are cached in
 * cad/onshape-docs.json so the folders are not created twice.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClient } from './onshape-api.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(ROOT, 'cad/onshape-docs.json');

const q = (id, expr) => ({ btType: 'BTMParameterQuantity-147', parameterId: id, expression: expr, isInteger: false });
const qi = (id, n) => ({ btType: 'BTMParameterQuantity-147', parameterId: id, expression: String(n), isInteger: true });
const b = (id, value) => ({ btType: 'BTMParameterBoolean-144', parameterId: id, value });
const e = (id, value, enumName) => ({ btType: 'BTMParameterEnum-145', parameterId: id, value, enumName, namespace: '' });

function stampEnumNs(parameters, ns) {
  return parameters.map((p) => (p.btType?.startsWith('BTMParameterEnum') ? { ...p, namespace: ns || p.namespace || '' } : p));
}

/** Mild-realism CAD drafts: same silhouette as the game, continuous curves (no 24-seg panels). Versions are game-v0.2. */
export const TARGETS = [
  {
    doc: 'pod_container_40hc',
    description: 'Aftermath pod: ISO 40 ft HC (12.192 × 2.438 × 2.896 m) stood on end, ISO corner castings. Source: cad/onshape/ShippingContainer.fs. Stage: game.',
    fs: 'ShippingContainer.fs',
    featureType: 'aftermathShippingContainer',
    featureName: 'Pod container 40HC',
    parameters: [
      q('length', '12.192 m'), q('width', '2.438 m'), q('depth', '2.896 m'), q('topZ', '12.192 m'),
      b('hollow', false), q('wallT', '0.08 m'), b('techDetails', false), b('isoCorners', true),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'solar_array',
    description: 'Aftermath solar array: Ø20 m × 0.12 m disc with rim and console (flat). Source: cad/onshape/SolarArray.fs. Stage: game.',
    fs: 'SolarArray.fs',
    featureType: 'aftermathSolarArray',
    featureName: 'Solar array',
    parameters: [
      q('diameter', '20 m'), q('thickness', '0.12 m'), b('pitched', false), q('pitch', '35 deg'),
      q('columnTop', '3.6 m'), q('flatCenterZ', '0.09 m'), q('offsetX', '0 m'),
      b('rim', true), b('withConsole', true), b('column', false),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'floor_slab',
    description: 'Aftermath floor slab: Ø20 m × 0.22 m with elevator + stair openings and balcony rail. Source: FloorSlab.fs.',
    fs: 'FloorSlab.fs',
    featureType: 'aftermathFloorSlab',
    featureName: 'Floor slab',
    parameters: [
      qi('floorIndex', 0), q('slabDiameter', '20 m'), q('slabThickness', '0.22 m'), q('floorHeight', '3.5 m'),
      q('coreDiameter', '3 m'), q('facadeDiameter', '15 m'), q('stairInset', '0.55 m'),
      q('treadRadial', '1.1 m'), q('landingClearW', '2.2 m'), q('railHeight', '1.1 m'),
      b('splitLanding', false), b('balconyRail', true),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'elevator_shaft',
    description: 'Aftermath elevator shaft: Ø3 m continuous core shell, wallT 0.15 m, door cut + curved leaf. Source: ElevatorShaft.fs.',
    fs: 'ElevatorShaft.fs',
    featureType: 'aftermathElevatorShaft',
    featureName: 'Elevator shaft',
    parameters: [
      qi('floorIndex', 0), qi('floorCount', 2), q('coreDiameter', '3 m'), q('wallT', '0.15 m'),
      q('coreHeight', '3.1 m'), q('floorHeight', '3.5 m'), q('slabThickness', '0.22 m'),
      q('doorWidth', '0.9 m'), q('doorHeight', '1.985 m'), b('withDoor', true),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'floor_walls',
    description: 'Aftermath floor walls: continuous Ø15 facade + Ø6.5 corridor (true curves, openings snapped to 96 angles). Source: FloorWalls.fs.',
    fs: 'FloorWalls.fs',
    featureType: 'aftermathFloorWalls',
    featureName: 'Floor walls',
    // frames/windows off for a lighter first export; shell geometry is the point of this draft
    parameters: [
      qi('floorIndex', 0), q('facadeDiameter', '15 m'), q('innerWallDiameter', '6.5 m'), q('coreDiameter', '3 m'),
      q('floorHeight', '3.5 m'), q('slabThickness', '0.22 m'), q('facadeT', '0.14 m'), q('partitionT', '0.08 m'),
      q('doorWidth', '0.885 m'), q('bathDoorWidth', '1.01 m'), q('doubleDoorWidth', '1.77 m'), q('doorHeight', '1.985 m'),
      q('windowWidth', '1.13 m'), q('windowHeight', '1.4 m'), q('windowSill', '0.9 m'),
      b('topFloor', false), b('frames', false), b('windows', false), b('furniture', false),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'exterior_stair',
    description: 'Aftermath exterior stair: one helical flight (24 risers) on the balcony ring. Source: ExteriorStair.fs.',
    fs: 'ExteriorStair.fs',
    featureType: 'aftermathExteriorStair',
    featureName: 'Exterior stair',
    parameters: [
      qi('fromFloor', 0), qi('flightCount', 1), q('slabDiameter', '20 m'), q('floorHeight', '3.5 m'),
      q('slabThickness', '0.22 m'), q('stairInset', '0.55 m'), q('treadRadial', '1.1 m'),
      qi('risersPerFloor', 24), q('landingClearW', '2.2 m'), q('railHeight', '1.1 m'), b('rails', true),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'agrokruh_bed',
    description: 'Aftermath Agrokruh: one Ø22 m bed with arm (full field off). Source: Agrokruh.fs.',
    fs: 'Agrokruh.fs',
    featureType: 'aftermathAgrokruh',
    featureName: 'Agrokruh bed',
    parameters: [
      b('fullField', false), q('yaw', '0 deg'), q('bedRadius', '11 m'), q('pivotSpacing', '24 m'),
      q('bedHeight', '0.18 m'), q('cropHeight', '0.35 m'), qi('armCount', 1), q('armYaw', '0 deg'),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'pod_assembly',
    description: 'Aftermath pod assembly: live stage (buried HC container + column + pitched solar). Source: PodAssembly.fs.',
    fs: 'PodAssembly.fs',
    featureType: 'aftermathPodAssembly',
    featureName: 'Pod assembly',
    parameters: [
      e('stage', 'LIVE_POD', 'AftermathPodStage'),
      b('includeSolar', true), b('includeBridge', true), b('includeBerm', true), b('techDetails', false),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'tower_floor',
    description: 'Aftermath tower floor 0: slab + continuous walls + core + flight (rails/frames off for weight). Source: Tower.fs.',
    fs: 'Tower.fs',
    featureType: 'aftermathTowerFloor',
    featureName: 'Tower floor',
    // game-v0.3: rails, door frames/leaves, windows and beds ON so it matches the procedural floor (Walk uses it).
    parameters: [
      qi('floorIndex', 0), b('topFloor', false), b('flightUp', true), b('rail', true),
      b('frames', true), b('windows', true), b('furniture', true), b('splitLanding', false),
      q('floorHeight', '3.5 m'), q('slabDiameter', '20 m'), q('slabThickness', '0.22 m'),
      q('facadeDiameter', '15 m'), q('innerWallDiameter', '6.5 m'), q('coreDiameter', '3 m'),
    ],
    version: 'game-v0.3',
  },
  {
    doc: 'tower',
    description: 'Aftermath tower reduced (2 floors) for CAD draft weight; continuous walls, rails/frames off. Source: Tower.fs.',
    fs: 'Tower.fs',
    featureType: 'aftermathTower',
    featureName: 'Tower',
    parameters: [
      qi('floors', 2), b('pod', true), b('solar', true), b('bridge', true),
      b('rail', false), b('frames', false), b('windows', false), b('furniture', false),
      q('floorHeight', '3.5 m'), q('slabDiameter', '20 m'), q('slabThickness', '0.22 m'),
      q('facadeDiameter', '15 m'), q('innerWallDiameter', '6.5 m'), q('coreDiameter', '3 m'),
    ],
    version: 'game-v0.2',
  },
  // ── everything-CAD pass (game-v0.2 for new docs) ──────────────────────────────────────────────
  {
    doc: 'tower_floor_mid',
    description: 'Aftermath tower mid floor (floor index 1: full balcony rail ring) with doors, windows, beds, rails and the flight up. Walk stacks it for floors 1..N-2 (rotated 45 deg per floor). Source: Tower.fs.',
    fs: 'Tower.fs',
    featureType: 'aftermathTowerFloor',
    featureName: 'Tower mid floor',
    parameters: [
      qi('floorIndex', 1), b('topFloor', false), b('flightUp', true), b('rail', true),
      b('frames', true), b('windows', true), b('furniture', true), b('splitLanding', false),
      q('floorHeight', '3.5 m'), q('slabDiameter', '20 m'), q('slabThickness', '0.22 m'),
      q('facadeDiameter', '15 m'), q('innerWallDiameter', '6.5 m'), q('coreDiameter', '3 m'),
    ],
    version: 'game-v0.2',
  },
  ...[1, 3, 7].map((n) => ({
    doc: `tower_crown_${n}`,
    description: `Aftermath tower crown for a ${n}-floor tower: top floor (index ${n - 1}) clipped to the pitched solar underside + roof infill ribbon, buried container, column, console, pitched Ø20 solar, bridge${n === 1 ? ', open-pit wall (rise-1)' : ''}. Source: Tower.fs.`,
    fs: 'Tower.fs',
    featureType: 'aftermathTowerCrown',
    featureName: `Tower crown ${n}`,
    parameters: [
      qi('floors', n), b('pitWall', n === 1), b('rail', true), b('frames', true), b('windows', true), b('furniture', true),
      b('pod', true), b('solar', true), b('bridge', true),
    ],
    version: 'game-v0.2',
  })),
  {
    doc: 'tower_lod',
    description: 'Aftermath neighbour LOD tower (7 floors): Ø15 facade, 8 slabs, stub column, pitched solar. Source: Tower.fs (buildRiseStageLod).',
    fs: 'Tower.fs',
    featureType: 'aftermathTowerLod',
    featureName: 'Tower LOD',
    parameters: [qi('floors', 7)],
    version: 'game-v0.2',
  },
  {
    doc: 'stage_excavate',
    description: 'Aftermath construction stage 2 (excavate): pit container, column + console, bridge to the column, spoil berm, pitched solar. Source: PodAssembly.fs.',
    fs: 'PodAssembly.fs',
    featureType: 'aftermathPodAssembly',
    featureName: 'Excavate stage',
    parameters: [
      e('stage', 'EXCAVATE', 'AftermathPodStage'),
      b('includeSolar', true), b('includeBridge', true), b('includeBerm', true), b('techDetails', false),
    ],
    version: 'game-v0.2',
  },
  {
    doc: 'live_pod_kit',
    description: 'Aftermath live pod kit: container, column, console, solar preview disc, live dig berm and beam (one named part each; Walk poses/toggles them). Source: Kits.fs.',
    fs: 'Kits.fs',
    featureType: 'aftermathLivePodKit',
    featureName: 'Live pod kit',
    parameters: [],
    version: 'game-v0.2',
  },
  {
    doc: 'gantry_kit',
    description: 'Aftermath gantry construction kit: column, berm, tech container, deck beams/rings/slab, slip wall/form, base wall, gantry crane parts, roof disc (Walk animates them). Source: Kits.fs.',
    fs: 'Kits.fs',
    featureType: 'aftermathGantryKit',
    featureName: 'Gantry kit',
    parameters: [],
    version: 'game-v0.2',
  },
  {
    doc: 'agrokruh_kit',
    description: 'Aftermath Agrokruh kit: soil bed, crop pad, pivot, arm (mast/boom/head/wheel/drop), tree trunk + canopy, shrubs (Walk places them with the seeded layout). Source: Kits.fs.',
    fs: 'Kits.fs',
    featureType: 'aftermathAgroKit',
    featureName: 'Agrokruh kit',
    parameters: [],
    version: 'game-v0.2',
  },
  {
    doc: 'crowd_kit',
    description: 'Aftermath crowd kit: skeleton figure segments at 1.75 m (hip, torso, chest, head, arms, legs, foot); Walk rigs and animates them. Source: Kits.fs.',
    fs: 'Kits.fs',
    featureType: 'aftermathCrowdKit',
    featureName: 'Crowd kit',
    parameters: [],
    version: 'game-v0.2',
  },
];

function args(argv) {
  const a = { only: null, folder: null, createFolders: null, version: true, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') a.only = argv[++i];
    else if (argv[i] === '--folder') a.folder = argv[++i];
    else if (argv[i] === '--create-folders') a.createFolders = argv[++i];
    else if (argv[i] === '--no-version') a.version = false;
    else if (argv[i] === '--verbose') a.verbose = true;
    else throw new Error(`unknown arg ${argv[i]}`);
  }
  return a;
}

async function main() {
  const a = args(process.argv.slice(2));
  const api = makeClient();
  const me = await api.get('/users/sessioninfo');
  const state = existsSync(STATE) ? JSON.parse(await readFile(STATE, 'utf8')) : { docs: {} };
  if (a.folder) state.folderId = a.folder;
  if (a.createFolders && !a.folder) {
    state.folders ??= {};
    let parentId;
    let acc = '';
    for (const name of a.createFolders.split('/').filter(Boolean)) {
      acc = acc ? `${acc}/${name}` : name;
      if (!state.folders[acc]) {
        const f = await api.post('/folders', { name, ownerType: 0, ownerId: me.id, ...(parentId ? { parentId } : {}) });
        state.folders[acc] = f.id;
        console.log(`created folder ${acc} ${f.id}`);
      } else console.log(`folder ${acc} ${state.folders[acc]} (cached)`);
      parentId = state.folders[acc];
    }
    state.folderId = parentId;
    await writeFile(STATE, JSON.stringify(state, null, 2) + '\n');
  }
  const folder = state.folderId ?? null;

  const only = a.only ? new Set(a.only.split(',')) : null;
  for (const t of TARGETS.filter((t) => !only || only.has(t.doc))) {
    console.log(`\n== ${t.doc}`);
    // 1. document
    // Prefer the cached id: document search is eventually consistent (a doc created seconds ago isn't found yet).
    let doc = state.docs[t.doc]?.did ? await api.get(`/documents/${state.docs[t.doc].did}`).catch(() => null) : null;
    if (doc?.trash) doc = null;
    if (!doc) {
      const found = (await api.get('/documents', { q: t.doc, filter: 0, limit: 20 })).items?.filter((d) => d.name === t.doc && d.owner?.id === me.id) ?? [];
      if (found.length) doc = await api.get(`/documents/${found[0].id}`);
    }
    if (doc) console.log(`  reuse document ${doc.id}`);
    else {
      doc = await api.post('/documents', { name: t.doc, description: t.description, isPublic: true, ...(folder ? { parentId: folder } : {}) });
      console.log(`  created document ${doc.id} (public=${doc.public})`);
    }
    state.docs[t.doc] = { ...state.docs[t.doc], did: doc.id };
    await writeFile(STATE, JSON.stringify(state, null, 2) + '\n');
    const did = doc.id;
    const wid = doc.defaultWorkspace.id;
    const elements = await api.get(`/documents/d/${did}/w/${wid}/elements`);

    // 2. feature studio
    let fs = elements.find((e) => e.elementType === 'FEATURESTUDIO' && e.name === t.fs);
    if (!fs) {
      const r = await api.post(`/featurestudios/d/${did}/w/${wid}`, { name: t.fs });
      fs = { id: r.id, name: r.name };
      console.log(`  created feature studio ${fs.id}`);
    }
    const current = await api.get(`/featurestudios/d/${did}/w/${wid}/e/${fs.id}`);
    const src = await readFile(path.join(ROOT, 'cad/onshape', t.fs), 'utf8');
    // New studios start with "FeatureScript N;" + an std import at the current std version (observed: 3083 and
    // onshape/std/common.fs). Keep the file's geometry.fs import but move both lines to Onshape's version N.
    const header = current.contents.split('\n').slice(0, 2);
    const n = header[0]?.match(/^FeatureScript (\d+);/)?.[1];
    const srcLines = src.split('\n');
    const onshapeHasHeader = Boolean(n) && /^FeatureScript \d+;/.test(srcLines[0]) && /^import\(path : "onshape\/std\//.test(srcLines[1]);
    const body = onshapeHasHeader
      ? [`FeatureScript ${n};`, srcLines[1].replace(/version : "\d+\.0"/, `version : "${n}.0"`), ...srcLines.slice(2)].join('\n')
      : src;
    if (a.verbose) console.log(`  onshape header: ${header.join(' | ')}; file header: ${srcLines.slice(0, 2).join(' | ')}`);
    if (current.contents.trim() !== body.trim()) {
      const up = await api.post(`/featurestudios/d/${did}/w/${wid}/e/${fs.id}`, {
        btType: 'BTFeatureStudioContents-2239',
        contents: body,
        serializationVersion: current.serializationVersion,
        sourceMicroversion: current.sourceMicroversion,
        rejectMicroversionSkew: false,
      });
      console.log(`  uploaded ${t.fs} (${body.length} chars, header ${onshapeHasHeader ? `FeatureScript ${n} (Onshape's current std)` : 'from file'})`);
      if (a.verbose) console.log('  update response keys:', Object.keys(up));
    } else console.log('  feature studio already up to date');

    // 3. compile check
    const specs = await api.get(`/featurestudios/d/${did}/w/${wid}/e/${fs.id}/featurespecs`);
    const spec = specs.featureSpecs?.find((s) => s.featureType === t.featureType);
    if (a.verbose) console.log('  specs:', JSON.stringify({ n: specs.featureSpecs?.length, types: specs.featureSpecs?.map((s) => s.featureType), keys: Object.keys(specs), libraryVersion: specs.libraryVersion }));
    if (!spec) {
      console.error(`  COMPILE: feature spec ${t.featureType} not found, so the Feature Studio probably has errors`);
      console.error('  specs response:', JSON.stringify(specs).slice(0, 1500));
      process.exitCode = 1;
      continue;
    }
    console.log(`  compile OK: ${t.featureType} ("${spec.featureTypeName ?? ''}"), namespace ${spec.namespace ?? '?'}`);

    // 4. part studio feature
    const ps = elements.find((e) => e.elementType === 'PARTSTUDIO' && e.name === 'Part Studio 1') ?? elements.find((e) => e.elementType === 'PARTSTUDIO');
    const feats = await api.get(`/partstudios/d/${did}/w/${wid}/e/${ps.id}/features`);
    let feat = feats.features.find((f) => f.featureType === t.featureType);
    let status = feat ? feats.featureStates?.[feat.featureId]?.featureStatus : null;
    if (!feat) {
      const elemsNow = await api.get(`/documents/d/${did}/w/${wid}/elements`, { elementId: fs.id });
      const ns = spec.namespace || `e${fs.id}::m${elemsNow[0].microversionId}`;
      const r = await api.post(`/partstudios/d/${did}/w/${wid}/e/${ps.id}/features`, {
        btType: 'BTFeatureDefinitionCall-1406',
        feature: { btType: 'BTMFeature-134', featureType: t.featureType, name: t.featureName, namespace: ns, parameters: stampEnumNs(t.parameters, ns), suppressed: false, returnAfterSubfeatures: false },
      });
      feat = r.feature;
      status = r.featureState?.featureStatus;
      console.log(`  added feature ${feat.featureId} (namespace ${ns})`);
    } else {
      // Always push current parameters (new defaults / mild-realism bumps / new booleans like isoCorners).
      const elemsNow = await api.get(`/documents/d/${did}/w/${wid}/elements`, { elementId: fs.id });
      const ns = spec.namespace || feat.namespace || `e${fs.id}::m${elemsNow[0].microversionId}`;
      const r = await api.post(`/partstudios/d/${did}/w/${wid}/e/${ps.id}/features/featureid/${feat.featureId}`, {
        btType: 'BTFeatureDefinitionCall-1406',
        feature: { ...feat, name: t.featureName, namespace: ns, parameters: stampEnumNs(t.parameters, ns), suppressed: false },
      });
      feat = r.feature ?? feat;
      status = r.featureState?.featureStatus ?? status;
      console.log(`  updated feature ${feat.featureId} (was ${status === 'OK' ? 'OK' : status})`);
      // Re-read status after update
      const feats2 = await api.get(`/partstudios/d/${did}/w/${wid}/e/${ps.id}/features`);
      status = feats2.featureStates?.[feat.featureId]?.featureStatus ?? status;
    }
    console.log(`  featureStatus: ${status}`);
    if (status !== 'OK') {
      const featsErr = await api.get(`/partstudios/d/${did}/w/${wid}/e/${ps.id}/features`);
      const st = featsErr.featureStates?.[feat.featureId];
      console.error('  featureState:', JSON.stringify(st).slice(0, 1200));
    }
    const parts = await api.get(`/parts/d/${did}/w/${wid}/e/${ps.id}`);
    console.log(`  parts: ${parts.length} (${parts.slice(0, 8).map((p) => p.name).join(', ')}${parts.length > 8 ? ', …' : ''})`);
    if (status !== 'OK' || !parts.length) {
      process.exitCode = 1;
      continue;
    }

    // 5. version
    let version = null;
    if (a.version) {
      const versions = await api.get(`/documents/d/${did}/versions`);
      version = versions.find((v) => v.name === t.version);
      if (!version) {
        version = await api.post(`/documents/d/${did}/versions`, { documentId: did, workspaceId: wid, name: t.version, description: 'Created by scripts/onshape-bootstrap.mjs' });
        console.log(`  created version ${t.version} ${version.id}`);
      } else console.log(`  version ${t.version} exists: ${version.id}`);
    }
    state.docs[t.doc] = {
      did,
      wid,
      featureStudioId: fs.id,
      partStudioId: ps.id,
      featureId: feat.featureId,
      versionName: version?.name ?? null,
      versionId: version?.id ?? null,
      parts: parts.map((p) => ({ partId: p.partId, name: p.name })),
      url: `https://cad.onshape.com/documents/${did}/w/${wid}/e/${ps.id}`,
      versionUrl: version ? `https://cad.onshape.com/documents/${did}/v/${version.id}/e/${ps.id}` : null,
    };
    console.log(`  ${state.docs[t.doc].url}`);
  }
  await writeFile(STATE, JSON.stringify(state, null, 2) + '\n');
}

main().catch((e) => {
  console.error(`onshape-bootstrap: ${e.message}`);
  process.exit(1);
});
