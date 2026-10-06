import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";

/**
 * Pit surface height for a vertex whose terrain height is `terrainY`.
 * `t` = 0 on the pit floor, 0→1 across the rim bank.
 *
 * Banks blend to the vertex's own terrain (not the centre grade) and the pit
 * only ever digs. Blending to centre grade on a slope raised the downhill
 * side into a floating shelf and left a cliff at the rim uphill — the big
 * stretched flaps seen in Walk on steep cells.
 */
function pitHeight(terrainY: number, floorY: number, t: number): number {
  const s = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); // smoothstep bank
  return Math.min(terrainY, floorY + (terrainY - floorY) * s);
}

/**
 * Punch a cylindrical pit into an updatable ground mesh so the hole
 * overrides the terrain instead of sitting under it.
 */
export function carveTerrainPit(
  ground: Mesh,
  cx: number,
  cz: number,
  radius: number,
  gradeY: number,
  depth: number,
  rimWidth = 2.2,
): void {
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) return;

  const rInner = radius;
  const rOuter = radius + rimWidth;
  const rInner2 = rInner * rInner;
  const rOuter2 = rOuter * rOuter;
  const floorY = gradeY - depth;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i] ?? 0;
    const z = positions[i + 2] ?? 0;
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rOuter2) continue;
    const t = d2 <= rInner2 ? 0 : (Math.sqrt(d2) - rInner) / rimWidth;
    positions[i + 1] = pitHeight(positions[i + 1] ?? gradeY, floorY, t);
  }

  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  const indices = ground.getIndices();
  const normals = ground.getVerticesData(VertexBuffer.NormalKind);
  if (indices && normals) {
    VertexData.ComputeNormals(positions, indices, normals);
    ground.updateVerticesData(VertexBuffer.NormalKind, normals);
  }
  ground.refreshBoundingInfo();
}

type PitMemory = { index: number; baseY: number };

const pitMemory = new WeakMap<Mesh, Map<string, PitMemory[]>>();

/** Blend a cylindrical pit from the mesh's current ground toward `depth`. `fraction` 0 restores it. */
export function setTerrainPitFraction(
  ground: Mesh,
  cx: number,
  cz: number,
  radius: number,
  gradeY: number,
  depth: number,
  fraction: number,
  rimWidth = 2.2,
): void {
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) return;

  let byMesh = pitMemory.get(ground);
  if (!byMesh) {
    byMesh = new Map();
    pitMemory.set(ground, byMesh);
  }
  const key = `${cx.toFixed(2)}:${cz.toFixed(2)}:${radius}`;
  let pit = byMesh.get(key);
  if (!pit) {
    pit = [];
    const rOuter2 = (radius + rimWidth) * (radius + rimWidth);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] ?? 0;
      const z = positions[i + 2] ?? 0;
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz <= rOuter2) {
        pit.push({ index: i, baseY: positions[i + 1] ?? gradeY });
      }
    }
    byMesh.set(key, pit);
  }

  const f = Math.min(1, Math.max(0, fraction));
  const rInner = radius;
  const rOuter = radius + rimWidth;
  const floorY = gradeY - depth;
  for (const vert of pit) {
    const i = vert.index;
    const x = positions[i] ?? 0;
    const z = positions[i + 2] ?? 0;
    const d = Math.hypot(x - cx, z - cz);
    const target =
      d < rOuter ? pitHeight(vert.baseY, floorY, d <= rInner ? 0 : (d - rInner) / rimWidth) : vert.baseY;
    positions[i + 1] = vert.baseY + (target - vert.baseY) * f;
  }

  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  const indices = ground.getIndices();
  const normals = ground.getVerticesData(VertexBuffer.NormalKind);
  if (indices && normals) {
    VertexData.ComputeNormals(positions, indices, normals);
    ground.updateVerticesData(VertexBuffer.NormalKind, normals);
  }
  ground.refreshBoundingInfo();
}
