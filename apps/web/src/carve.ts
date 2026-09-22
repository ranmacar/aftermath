import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";

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
    if (d2 <= rInner2) {
      positions[i + 1] = floorY;
    } else if (d2 < rOuter2) {
      const d = Math.sqrt(d2);
      const t = (d - rInner) / rimWidth; // 0 at lip inner, 1 at outer
      // Smoothstep bank
      const s = t * t * (3 - 2 * t);
      positions[i + 1] = floorY + (gradeY - floorY) * s;
    }
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
