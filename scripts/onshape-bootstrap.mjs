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
const b = (id, value) => ({ btType: 'BTMParameterBoolean-144', parameterId: id, value });

export const TARGETS = [
  {
    doc: 'pod_container_40hc',
    description: 'Aftermath pod: 40 ft HC ISO container (12.192 × 2.438 × 2.896 m), stood on end, base at Z = 0. Source: github.com (aftermath repo) cad/onshape/ShippingContainer.fs. Stage: game.',
    fs: 'ShippingContainer.fs',
    featureType: 'aftermathShippingContainer',
    featureName: 'Pod container 40HC',
    parameters: [q('length', '12.192 m'), q('width', '2.438 m'), q('depth', '2.896 m'), q('topZ', '12.192 m'), b('hollow', false), q('wallT', '0.08 m'), b('techDetails', false)],
    version: 'game-v0.1',
  },
  {
    doc: 'solar_array',
    description: 'Aftermath solar array: Ø20 m × 0.12 m disc with rim and console (flat). Source: cad/onshape/SolarArray.fs. Stage: game.',
    fs: 'SolarArray.fs',
    featureType: 'aftermathSolarArray',
    featureName: 'Solar array',
    // The features API does not fill in precondition defaults, so every parameter must be given (observed:
    // featureStatus ERROR with an empty list). Values = the .fs defaults (flat disc, rim, console).
    parameters: [q('diameter', '20 m'), q('thickness', '0.12 m'), b('pitched', false), q('pitch', '35 deg'), q('columnTop', '3.6 m'), q('flatCenterZ', '0.09 m'), q('offsetX', '0 m'), b('rim', true), b('withConsole', true), b('column', false)],
    version: 'game-v0.1',
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

  for (const t of TARGETS.filter((t) => !a.only || t.doc === a.only)) {
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
        feature: { btType: 'BTMFeature-134', featureType: t.featureType, name: t.featureName, namespace: ns, parameters: t.parameters, suppressed: false, returnAfterSubfeatures: false },
      });
      feat = r.feature;
      status = r.featureState?.featureStatus;
      console.log(`  added feature ${feat.featureId} (namespace ${ns})`);
    } else {
      console.log(`  feature already present: ${feat.featureId}`);
      if (status !== 'OK') {
        const r = await api.post(`/partstudios/d/${did}/w/${wid}/e/${ps.id}/features/featureid/${feat.featureId}`, {
          btType: 'BTFeatureDefinitionCall-1406',
          feature: { ...feat, name: t.featureName, parameters: t.parameters },
        });
        status = r.featureState?.featureStatus;
        console.log(`  updated parameters (was not OK)`);
      }
    }
    console.log(`  featureStatus: ${status}`);
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
