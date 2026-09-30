#!/usr/bin/env node
/**
 * cad-sync: Onshape → optimized GLB (+ LODs) → apps/web/public/models + cad/assets.lock.json
 *
 * Spec: docs/asset-pipeline.md
 *
 * Usage:
 *   npm run cad:sync                          # all non-placeholder assets (needs ONSHAPE_* keys)
 *   npm run cad:sync -- --dry-run             # no network: validate cad/assets.json only
 *   npm run cad:sync -- --only <name>         # one asset
 *   npm run cad:sync -- --from-file x.glb     # optimize a local GLB (no keys), writes to --out
 *        [--only <name>] [--out <dir>] [--units m|mm|cm|in|auto] [--up z|y]
 *   npm run cad:sync -- --report <file.md>    # write a size/version diff (used by CI for the PR body)
 *   npm run cad:sync -- --strict              # stage/version-name mismatches become errors
 *   npm run cad:sync -- --manifest m.json --out /tmp/x [--keep-raw]
 *                                             # live sync of another manifest into a scratch dir
 *                                             # (models + lock go to --out; the repo is untouched)
 *   npm run cad:sync -- --api-get /users/sessioninfo   # debug: signed GET, prints the JSON response
 *
 * Env (never exposed to the browser build; no VITE_ prefix):
 *   ONSHAPE_ACCESS_KEY, ONSHAPE_SECRET_KEY   API key pair (Onshape → My account → Developer).
 *                                            If unset, they are loaded from ONSHAPE_ENV_FILE
 *                                            (default ~/.config/aftermath/onshape.env, KEY=value lines).
 *   ONSHAPE_AUTH=hmac|basic                  default hmac (request signature); basic = local debugging
 *   ONSHAPE_BASE_URL                         default https://cad.onshape.com
 *   ONSHAPE_API_VERSION                      default v11 (the version used in the translation guide)
 *
 * Onshape API references (checked 2026-09-30 against https://cad.onshape.com/api/openapi, API 1.221):
 *   Auth (API keys, Basic + HMAC request signature, re-sign 307 redirects):
 *     https://onshape-public.github.io/docs/auth/apikeys/
 *   Exports (sync glTF with 307 redirect; async export/gltf → translations → externaldata):
 *     https://onshape-public.github.io/docs/api-adv/translation/
 *   Operation ids (API Explorer https://cad.onshape.com/glassworks/explorer/):
 *     PartStudio/exportPartStudioGltf     GET  /partstudios/d/{did}/{wvm}/{wvmid}/e/{eid}/gltf
 *     Part/exportPartGltf                 GET  /parts/d/{did}/{wvm}/{wvmid}/e/{eid}/partid/{partid}/gltf
 *     Assembly/createAssemblyExportGltf   POST /assemblies/d/{did}/{wv}/{wvid}/e/{eid}/export/gltf
 *     Translation/getTranslation          GET  /translations/{tid}
 *     Document/downloadExternalData       GET  /documents/d/{did}/externaldata/{fid}
 *     Document/getVersion                 GET  /documents/d/{did}/versions/{vid}
 *     Document/getCurrentMicroversion     GET  /documents/d/{did}/{wv}/{wvid}/currentmicroversion
 *     Variables/getVariables              GET  /variables/d/{did}/{wv}/{wvid}/e/{eid}/variables
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger, NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { cloneDocument, dedup, meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { makeClient, sleep } from './onshape-api.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = path.join(ROOT, 'cad/assets.json');
const LOCK = path.join(ROOT, 'cad/assets.lock.json');
const MODELS_DIR = path.join(ROOT, 'apps/web/public/models');

const STAGES = ['concept', 'game', 'prototype', 'buildable'];
const UNITS = { m: 1, cm: 0.01, mm: 0.001, in: 0.0254, auto: null };
const NAME_CONVENTIONS = /^(door|walk|collide|window|anchor)_/;
// Sync glTF tessellation query params. Units unverified in the spec; empirically see docs §8.
const DEFAULT_TESSELLATION = { angleTolerance: 0.2618, chordTolerance: 0.002 }; // ~15°, 2 mm
const DEFAULT_LODS = [{ ratio: 1 }, { ratio: 0.5, error: 0.01 }, { ratio: 0.2, error: 0.03 }];

// ─── CLI ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { dryRun: false, only: null, fromFile: null, out: null, report: null, strict: false, units: null, up: null, manifest: null, keepRaw: false, apiGet: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) die(`${k} needs a value`);
      return v;
    };
    if (k === '--dry-run') a.dryRun = true;
    else if (k === '--strict') a.strict = true;
    else if (k === '--only') a.only = next();
    else if (k === '--manifest') a.manifest = next();
    else if (k === '--keep-raw') a.keepRaw = true;
    else if (k === '--api-get') a.apiGet = next();
    else if (k === '--from-file') a.fromFile = next();
    else if (k === '--out') a.out = next();
    else if (k === '--report') a.report = next();
    else if (k === '--units') a.units = next();
    else if (k === '--up') a.up = next();
    else if (k === '-h' || k === '--help') {
      console.log(readHelp());
      process.exit(0);
    } else die(`unknown argument ${k}`);
  }
  return a;
}
function readHelp() {
  return 'cad-sync [--dry-run] [--only <name>] [--manifest <json>] [--out <dir>] [--keep-raw] [--from-file <glb> [--units m|mm|cm|in|auto] [--up z|y]] [--report <md>] [--strict] [--api-get <path>]\nSee docs/asset-pipeline.md';
}
function die(msg) {
  console.error(`cad-sync: ${msg}`);
  process.exit(1);
}

// ─── Manifest ───────────────────────────────────────────────────────────────
const ID24 = /^[0-9a-f]{24}$/;
const isTodo = (v) => typeof v === 'string' && /^TODO/i.test(v);

/** Returns { assets, errors[], warnings[] }. Placeholders (placeholder:true or TODO ids) are valid but skipped live. */
function validateManifest(manifest) {
  const errors = [];
  const warnings = [];
  if (!manifest || !Array.isArray(manifest.assets)) return { assets: [], errors: ['manifest must have an "assets" array'], warnings };
  const names = new Set();
  const outputs = new Set();
  const assets = manifest.assets.map((raw, i) => {
    const where = `assets[${i}]${raw?.name ? ` (${raw.name})` : ''}`;
    const e = (m) => errors.push(`${where}: ${m}`);
    const a = { elementType: 'partstudio', units: 'm', upAxis: 'z', compress: 'meshopt', lods: DEFAULT_LODS, ...raw };
    a.placeholder = Boolean(raw.placeholder) || ['did', 'wvmid', 'elementId'].some((k) => isTodo(raw[k]));

    if (typeof a.name !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(a.name)) e('name must be a lowercase slug');
    else if (names.has(a.name)) e('duplicate name');
    else names.add(a.name);

    for (const k of ['did', 'wvmid', 'elementId']) {
      if (typeof a[k] !== 'string') e(`${k} is required`);
      else if (!isTodo(a[k]) && !ID24.test(a[k])) e(`${k} must be a 24-char hex Onshape id (or "TODO…")`);
    }
    if (!['w', 'v', 'm'].includes(a.wvm)) e('wvm must be "w", "v" or "m"');
    if (a.wvm === 'w' && !a.placeholder) warnings.push(`${where}: pinned to a workspace (w), so the output follows live edits. Pin a version (v) before release`);
    if (!['partstudio', 'assembly'].includes(a.elementType)) e('elementType must be "partstudio" or "assembly"');
    if (a.elementType === 'assembly' && a.wvm === 'm') e('assembly export (async) supports only w or v');
    if (a.partId != null && (typeof a.partId !== 'string' || a.elementType !== 'partstudio')) e('partId must be a string and only for partstudio');
    if (a.configuration != null && typeof a.configuration !== 'string') e('configuration must be a string like "Name=value;Other=1"');

    if (typeof a.output !== 'string' || !a.output.endsWith('.glb')) e('output must be a .glb path relative to apps/web/public/models');
    else if (path.isAbsolute(a.output) || a.output.split(/[\\/]/).includes('..')) e('output must stay inside apps/web/public/models');
    else if (outputs.has(a.output)) e('duplicate output');
    else outputs.add(a.output);

    if (!Array.isArray(a.lods) || a.lods.length === 0) e('lods must be a non-empty array');
    else a.lods.forEach((l, j) => {
      if (typeof l?.ratio !== 'number' || l.ratio <= 0 || l.ratio > 1) e(`lods[${j}].ratio must be in (0, 1]`);
      if (l?.error != null && (typeof l.error !== 'number' || l.error < 0 || l.error > 1)) e(`lods[${j}].error must be in [0, 1]`);
    });

    if (!STAGES.includes(a.stage)) e(`stage must be one of ${STAGES.join(', ')}`);
    // Rule: nothing reaches buildable without human review.
    if (a.stage === 'buildable' && (typeof a.reviewedBy !== 'string' || !a.reviewedBy.trim())) e('stage "buildable" requires "reviewedBy" (human review)');

    if (!(a.units in UNITS)) e(`units must be one of ${Object.keys(UNITS).join(', ')}`);
    if (!['z', 'y'].includes(a.upAxis)) e('upAxis must be "z" (Onshape) or "y"');
    if (!['meshopt', 'none'].includes(a.compress)) e('compress must be "meshopt" or "none"');
    if (a.params != null) {
      const p = a.params;
      if (typeof p !== 'object' || typeof p.elementId !== 'string' || typeof p.output !== 'string' || !p.output.endsWith('.json')) e('params needs { elementId, output: "*.json" }');
      else if (!isTodo(p.elementId) && !ID24.test(p.elementId)) e('params.elementId must be a 24-char hex id');
      else if (path.isAbsolute(p.output) || p.output.split(/[\\/]/).includes('..')) e('params.output must stay inside apps/web/public/models');
      if (a.wvm === 'm') e('params (variables API) supports only w or v');
      if (isTodo(p?.elementId)) a.placeholder = true;
    }
    return a;
  });
  return { assets, errors, warnings };
}

async function sourceInfo(api, a) {
  if (a.wvm === 'v') {
    const v = await api.get(`/documents/d/${a.did}/versions/${a.wvmid}`);
    return { versionName: v.name, versionId: v.id, microversion: v.microversion, createdAt: v.createdAt };
  }
  if (a.wvm === 'w') {
    const m = await api.get(`/documents/d/${a.did}/w/${a.wvmid}/currentmicroversion`);
    return { versionName: null, workspaceId: a.wvmid, microversion: m.microversion };
  }
  return { versionName: null, microversion: a.wvmid };
}

/** Returns raw glTF bytes (GLB or glTF JSON) from Onshape. */
async function exportGltf(api, a) {
  const base = `/d/${a.did}/${a.wvm}/${a.wvmid}/e/${a.elementId}`;
  if (a.elementType === 'partstudio') {
    // Synchronous export: GET …/gltf → 307 → file (docs: "Synchronous exports").
    // Onshape's default tessellation is very fine (observed: 240k tris for a 12 cm crank), so
    // game assets default to a coarse setting. Override per asset with "tessellation".
    const t = { ...DEFAULT_TESSELLATION, ...a.tessellation };
    const q = { configuration: a.configuration || undefined, angleTolerance: t.angleTolerance, chordTolerance: t.chordTolerance, maxFacetWidth: t.maxFacetWidth };
    const p = a.partId ? `/parts${base}/partid/${encodeURIComponent(a.partId)}/gltf` : `/partstudios${base}/gltf`;
    return api.get(p, q, { accept: 'model/gltf-binary;qs=0.08, model/gltf+json;qs=0.07', raw: true });
  }
  // Assembly: asynchronous export (docs: "Export an Assembly to glTF, OBJ, or Step").
  // storeInDocument:false → result lands in external data, so no blob tab is added to the (possibly versioned) doc.
  // NOTE: configuration is not a documented body field for this endpoint; configured assemblies are unverified.
  const t = await api.post(`/assemblies${base}/export/gltf`, {
    storeInDocument: false,
    notifyUser: false,
    grouping: true,
    meshParams: { resolution: a.tessellation?.resolution ?? 'COARSE', unit: 'METER' },
    destinationName: a.name,
  });
  let tr = t;
  for (let i = 0; tr.requestState === 'ACTIVE'; i++) {
    if (i > 40) throw new Error(`translation ${t.id} still ACTIVE, giving up`);
    await sleep(Math.min(2000 * 1.5 ** i, 15000));
    tr = await api.get(`/translations/${t.id}`);
  }
  if (tr.requestState !== 'DONE') throw new Error(`translation ${t.id} ${tr.requestState}: ${tr.failureReason}`);
  const fid = tr.resultExternalDataIds?.[0];
  if (!fid) throw new Error(`translation ${t.id} has no resultExternalDataIds`);
  return api.get(`/documents/d/${a.did}/externaldata/${fid}`, null, { accept: 'application/octet-stream', raw: true });
}

async function exportParams(api, a, src) {
  const wv = a.wvm;
  const tables = await api.get(`/variables/d/${a.did}/${wv}/${a.wvmid}/e/${a.params.elementId}/variables`, {
    includeValuesAndReferencedVariables: true,
    configuration: a.configuration,
  });
  const variables = {};
  for (const t of tables) for (const v of t.variables ?? []) variables[v.name] = { value: v.value, expression: v.expression, type: v.type };
  return { name: a.name, source: { did: a.did, wvm: a.wvm, wvmid: a.wvmid, elementId: a.params.elementId, ...src }, variables };
}

// ─── Optimize ───────────────────────────────────────────────────────────────
const QUIET = new Logger(Logger.Verbosity.WARN);
let ioPromise;
function getIO() {
  ioPromise ??= Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]).then(() =>
    new NodeIO().setLogger(new Logger(Logger.Verbosity.ERROR)).registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder }),
  );
  return ioPromise;
}

/** JSON chunk of a GLB, or the parsed .gltf. */
function gltfJson(bytes) {
  if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    const len = new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
    return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + len)));
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function readAny(io, bytes) {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) throw new Error('export is a ZIP (multi-file); set grouping or export a single element');
  const isGlb = bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
  const json = gltfJson(bytes);
  const doc = isGlb ? await io.readBinary(bytes) : await io.readJSON({ json, resources: {} }); // .gltf with data: URIs
  // Onshape adds the vendor extension PTC_onshape_metadata ({ id: [partId | occurrenceId] } per node, { documentId, elementId }
  // at the root). gltf-transform drops unknown extensions, so copy it into extras, which survive the rewrite.
  const nodes = doc.getRoot().listNodes();
  (json.nodes ?? []).forEach((n, i) => {
    const ids = n.extensions?.PTC_onshape_metadata?.id;
    if (ids && nodes[i]) nodes[i].setExtras({ ...nodes[i].getExtras(), onshapeId: ids.length === 1 ? ids[0] : ids });
  });
  const rootMeta = json.extensions?.PTC_onshape_metadata;
  if (rootMeta) doc.getRoot().setExtras({ ...doc.getRoot().getExtras(), onshape: rootMeta });
  return doc;
}

function stats(doc) {
  let tris = 0;
  let verts = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const n = p.getIndices()?.getCount() ?? p.getAttribute('POSITION')?.getCount() ?? 0;
      if (p.getMode() === 4) tris += n / 3;
      verts += p.getAttribute('POSITION')?.getCount() ?? 0;
    }
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const b = scene ? getBounds(scene) : { min: [0, 0, 0], max: [0, 0, 0] };
  const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(4));
  return { triangles: Math.round(tris), vertices: verts, bboxMin: b.min.map((v) => +v.toFixed(4)), bboxMax: b.max.map((v) => +v.toFixed(4)), size };
}

/**
 * Wraps each scene's roots in one `cad_root` node carrying the unit scale and the axis fix.
 * Onshape is Z-up (X east, Y north). glTF is Y-up. The rotation is 180° about (0,1,1)/√2:
 * (x,y,z) → (−x, z, y). Babylon's glTF loader then flips handedness (x → −x), so in the
 * game an Onshape point (x,y,z) lands at Babylon (x, z, y), the same mapping as cad/onshape/README.md.
 */
function normalizeFrame(doc, { scale, upAxis }) {
  const root = doc.getRoot();
  for (const scene of root.listScenes()) {
    const wrap = doc.createNode('cad_root').setScale([scale, scale, scale]);
    if (upAxis === 'z') wrap.setRotation([0, Math.SQRT1_2, Math.SQRT1_2, 0]);
    for (const child of scene.listChildren()) {
      scene.removeChild(child);
      wrap.addChild(child);
    }
    scene.addChild(wrap);
  }
}

function resolveUnits(doc, units) {
  if (units !== 'auto') return { scale: UNITS[units], units };
  const s = stats(doc);
  const ext = Math.max(...s.size);
  // Heuristic: game/fab assets are < 300 m. Anything larger is almost certainly mm.
  const picked = ext > 300 ? 'mm' : 'm';
  console.warn(`  units:auto → ${picked} (raw extent ${ext})`);
  return { scale: UNITS[picked], units: picked };
}

const namedParts = (doc) => doc.getRoot().listNodes().map((n) => n.getName()).filter((n) => NAME_CONVENTIONS.test(n)).sort();

/** raw bytes → [{ suffix, bytes, stats }] per LOD */
async function optimize(rawBytes, a) {
  const io = await getIO();
  const src = await readAny(io, rawBytes);
  src.setLogger(QUIET);
  const rawStats = stats(src);
  const { scale, units } = resolveUnits(src, a.units);
  normalizeFrame(src, { scale, upAxis: a.upAxis });
  await src.transform(dedup(), weld(), prune());

  const out = [];
  for (const [i, lod] of a.lods.entries()) {
    const doc = cloneDocument(src);
    doc.setLogger(QUIET);
    const steps = [];
    if (lod.ratio < 1) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: lod.ratio, error: lod.error ?? 0.01 }));
    steps.push(prune());
    // meshopt(): reorder + quantize + EXT_meshopt_compression. Babylon supports this extension, and its decoder loads from the Babylon CDN by default.
    if (a.compress === 'meshopt') steps.push(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await doc.transform(...steps);
    doc.getRoot().getAsset().generator = 'aftermath cad-sync (gltf-transform)';
    const bytes = await io.writeBinary(doc);
    out.push({ suffix: i === 0 ? '' : `_lod${i}`, ratio: lod.ratio, bytes, stats: stats(doc) });
  }
  return { raw: rawStats, units, lods: out, namedParts: namedParts(src) };
}

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const lodPath = (output, suffix) => output.replace(/\.glb$/, `${suffix}.glb`);

async function writeOutputs(dir, a, result) {
  const files = [];
  for (const l of result.lods) {
    const rel = lodPath(a.output, l.suffix);
    const abs = path.join(dir, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, l.bytes);
    files.push({ file: rel, ratio: l.ratio, bytes: l.bytes.byteLength, sha256: sha256(l.bytes), triangles: l.stats.triangles, size: l.stats.size });
  }
  return files;
}

function printResult(name, result, files) {
  console.log(`  raw: ${result.raw.triangles} tris, extent ${result.raw.size.join(' × ')} (units ${result.units})`);
  for (const f of files) console.log(`  → ${f.file}  ${fmtBytes(f.bytes)}  ${f.triangles} tris  size ${f.size.join(' × ')} m`);
  if (result.namedParts.length) console.log(`  named parts: ${result.namedParts.join(', ')}`);
}
const fmtBytes = (n) => (n == null ? '–' : n > 1e6 ? `${(n / 1e6).toFixed(2)} MB` : `${(n / 1e3).toFixed(1)} kB`);

// ─── Lock + report ──────────────────────────────────────────────────────────
async function readJson(p, fallback) {
  if (!existsSync(p)) return fallback;
  return JSON.parse(await readFile(p, 'utf8'));
}

function diffReport(oldLock, newLock) {
  const rows = [];
  const names = new Set([...Object.keys(oldLock.assets ?? {}), ...Object.keys(newLock.assets ?? {})]);
  for (const n of [...names].sort()) {
    const o = oldLock.assets?.[n];
    const w = newLock.assets?.[n];
    const ov = o ? o.source.versionName ?? o.source.microversion : '–';
    const nv = w ? w.source.versionName ?? w.source.microversion : '–';
    const ob = o?.outputs?.reduce((s, f) => s + f.bytes, 0);
    const nb = w?.outputs?.reduce((s, f) => s + f.bytes, 0);
    if (o && w && o.rawSha256 === w.rawSha256 && JSON.stringify(o.outputs) === JSON.stringify(w.outputs)) continue;
    const delta = ob != null && nb != null ? ` (${nb >= ob ? '+' : ''}${fmtBytes(nb - ob)})` : '';
    rows.push(`| \`${n}\` | ${w?.stage ?? o?.stage} | ${ov} → ${nv} | ${fmtBytes(ob)} → ${fmtBytes(nb)}${delta} | ${w?.outputs?.[0]?.triangles ?? '–'} |`);
  }
  if (!rows.length) return 'No asset changes.\n';
  return ['| Asset | Stage | Version | Size (all LODs) | LOD0 tris |', '|---|---|---|---|---|', ...rows, ''].join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const MANIFEST = path.resolve(args.manifest ?? DEFAULT_MANIFEST);
  // Live runs with --out write models + lock to that dir instead of the repo.
  const liveOut = !args.fromFile && args.out ? path.resolve(args.out) : null;
  const MODELS = liveOut ?? MODELS_DIR;
  const LOCKFILE = liveOut ? path.join(liveOut, 'assets.lock.json') : LOCK;

  if (args.apiGet) {
    const api = makeClient();
    const [p, q] = args.apiGet.split('?');
    const res = await api.get(p, Object.fromEntries(new URLSearchParams(q ?? '')));
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  const manifest = await readJson(MANIFEST, null);
  if (!manifest) die(`missing ${path.relative(ROOT, MANIFEST)}`);
  const { assets, errors, warnings } = validateManifest(manifest);
  warnings.forEach((w) => console.warn(`warn: ${w}`));
  if (errors.length) die(`manifest invalid:\n  ${errors.join('\n  ')}`);

  let selected = assets;
  if (args.only) {
    selected = assets.filter((a) => a.name === args.only);
    if (!selected.length) die(`no asset named "${args.only}"`);
  }

  // --from-file: optimize a local GLB, no network or keys. Writes to --out (default: tmp), never to the lock.
  if (args.fromFile) {
    // With --only, reuse that manifest entry's units/axis/LOD settings; otherwise use defaults.
    const base = (args.only && selected[0]) || { name: path.basename(args.fromFile, '.glb'), units: 'auto', upAxis: 'z', compress: 'meshopt', lods: DEFAULT_LODS };
    const a = { ...base, output: `${base.name}.glb`, units: args.units ?? base.units, upAxis: args.up ?? base.upAxis };
    if (!(a.units in UNITS)) die(`--units must be one of ${Object.keys(UNITS).join(', ')}`);
    if (!['z', 'y'].includes(a.upAxis)) die('--up must be z or y');
    const outDir = path.resolve(args.out ?? path.join(tmpdir(), 'aftermath-cad-sync'));
    console.log(`from-file ${args.fromFile} → ${outDir} (units ${a.units}, up ${a.upAxis}, lods ${a.lods.map((l) => l.ratio).join('/')})`);
    const raw = new Uint8Array(await readFile(args.fromFile));
    const result = await optimize(raw, a);
    const files = await writeOutputs(outDir, a, result);
    printResult(a.name, result, files);
    await writeFile(path.join(outDir, `${a.name}.stats.json`), JSON.stringify({ raw: result.raw, units: result.units, namedParts: result.namedParts, outputs: files }, null, 2) + '\n');
    return;
  }

  if (args.dryRun) {
    console.log(`manifest OK: ${assets.length} asset(s)`);
    for (const a of selected) {
      const lods = a.lods.map((l, i) => lodPath(a.output, i ? `_lod${i}` : '') + `@${l.ratio}`).join(', ');
      console.log(`  ${a.placeholder ? '[placeholder, skipped live] ' : ''}${a.name}: ${a.elementType} ${a.did}/${a.wvm}/${a.wvmid}/e/${a.elementId}${a.partId ? ` part ${a.partId}` : ''} stage=${a.stage} → ${lods}${a.params ? ` + ${a.params.output}` : ''}`);
    }
    return;
  }

  const api = makeClient();
  if (liveOut) await mkdir(liveOut, { recursive: true });

  const oldLock = await readJson(LOCKFILE, { lockfileVersion: 1, assets: {} });
  const newLock = { lockfileVersion: 1, assets: { ...oldLock.assets } };
  let failed = 0;
  for (const a of selected) {
    if (a.placeholder) {
      console.log(`skip ${a.name} (placeholder)`);
      continue;
    }
    console.log(`sync ${a.name}`);
    try {
      const src = await sourceInfo(api, a);
      // Stage prefix: "game/…" or "game-…" (e.g. game-v0.1).
      if (a.wvm === 'v' && src.versionName && !new RegExp(`^${a.stage}[/-]`).test(src.versionName)) {
        const msg = `${a.name}: version "${src.versionName}" doesn't start with stage prefix "${a.stage}/" or "${a.stage}-"`;
        if (args.strict) throw new Error(msg);
        console.warn(`warn: ${msg}`);
      }
      const raw = await exportGltf(api, a);
      const rawSha256 = sha256(raw);
      if (args.keepRaw) {
        const rawPath = path.join(liveOut ?? path.join(tmpdir(), 'aftermath-cad-sync'), 'raw', `${a.name}.raw${raw[0] === 0x67 ? '.glb' : '.gltf'}`);
        await mkdir(path.dirname(rawPath), { recursive: true });
        await writeFile(rawPath, raw);
        console.log(`  raw export kept: ${rawPath} (${fmtBytes(raw.byteLength)})`);
      }
      const prev = oldLock.assets?.[a.name];
      const result = await optimize(raw, a);
      const outputs = await writeOutputs(MODELS, a, result);
      printResult(a.name, result, outputs);
      let params;
      if (a.params) {
        const pj = await exportParams(api, a, src);
        const abs = path.join(MODELS, a.params.output);
        await mkdir(path.dirname(abs), { recursive: true });
        const text = JSON.stringify(pj, null, 2) + '\n';
        await writeFile(abs, text);
        params = { file: a.params.output, sha256: sha256(text), count: Object.keys(pj.variables).length };
        console.log(`  → ${a.params.output} (${params.count} variables)`);
      }
      const unchanged = prev && prev.rawSha256 === rawSha256 && JSON.stringify(prev.outputs) === JSON.stringify(outputs);
      newLock.assets[a.name] = {
        stage: a.stage,
        ...(a.reviewedBy ? { reviewedBy: a.reviewedBy } : {}),
        source: { did: a.did, wvm: a.wvm, wvmid: a.wvmid, elementType: a.elementType, elementId: a.elementId, partId: a.partId ?? null, configuration: a.configuration ?? null, ...src },
        onshapeUrl: `https://cad.onshape.com/documents/${a.did}/${a.wvm}/${a.wvmid}/e/${a.elementId}`,
        exportedAt: unchanged ? prev.exportedAt : new Date().toISOString(),
        rawSha256,
        rawBytes: raw.byteLength,
        units: result.units,
        namedParts: result.namedParts,
        outputs,
        ...(params ? { params } : {}),
      };
    } catch (err) {
      failed++;
      console.error(`error ${a.name}: ${err.message}`);
    }
  }
  // Drop lock entries for assets that are no longer in the manifest.
  for (const n of Object.keys(newLock.assets)) if (!assets.some((a) => a.name === n && !a.placeholder)) delete newLock.assets[n];
  newLock.assets = Object.fromEntries(Object.entries(newLock.assets).sort(([x], [y]) => x.localeCompare(y)));
  await writeFile(LOCKFILE, JSON.stringify(newLock, null, 2) + '\n');
  const report = diffReport(oldLock, newLock);
  console.log(`\n${report}`);
  if (args.report) await writeFile(args.report, report);
  if (failed) die(`${failed} asset(s) failed`);
}

main().catch((e) => die(e.stack ?? String(e)));
