#!/usr/bin/env node
/**
 * Writes a small synthetic "Onshape-like" GLB for testing `cad-sync --from-file`:
 * Z-up, millimetres, 3 named parts (walk_base, door_leaf, collide_box). Each is a subdivided box
 * (so simplify has something to reduce), and the base is offset toward +Y (north) so the axis fix can be checked.
 *
 *   node scripts/cad-make-test-glb.mjs [out.glb]   (default: $TMPDIR/aftermath-cad-test.glb)
 */
import { Document, NodeIO } from '@gltf-transform/core';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const out = process.argv[2] ?? path.join(tmpdir(), 'aftermath-cad-test.glb');
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('Part Studio 1');
const mat = doc.createMaterial('steel').setBaseColorFactor([0.6, 0.62, 0.65, 1]).setMetallicFactor(0.8);

/** Box with each face split into n×n quads. Separate vertices per face (like a CAD tessellation). */
function box(name, [sx, sy, sz], [cx, cy, cz], n = 12) {
  const pos = [];
  const nor = [];
  const idx = [];
  const faces = [
    [0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1],
  ]; // [u axis, v axis, normal axis, sign]
  const half = [sx / 2, sy / 2, sz / 2];
  for (const [ua, va, na, s] of faces) {
    const base = pos.length / 3;
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const p = [0, 0, 0];
        p[ua] = (i / n - 0.5) * 2 * half[ua];
        p[va] = (j / n - 0.5) * 2 * half[va] * s;
        p[na] = half[na] * s;
        pos.push(p[0] + cx, p[1] + cy, p[2] + cz);
        const q = [0, 0, 0];
        q[na] = s;
        nor.push(...q);
      }
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const a = base + j * (n + 1) + i;
        idx.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1);
      }
  }
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer))
    .setMaterial(mat);
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
}

// mm, Z-up: base 2000 (X) × 4000 (Y, north) × 200 (Z), centred at y = +3000
box('walk_base', [2000, 4000, 200], [0, 3000, 100]);
box('door_leaf', [900, 40, 1985], [0, 1000, 1192]);
box('collide_box', [2000, 4000, 2400], [0, 3000, 1200], 1);
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
await new NodeIO().write(out, doc);
console.log(`wrote ${out}`);
