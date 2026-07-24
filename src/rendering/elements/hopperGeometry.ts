/**
 * Pure geometry maths for the hopper walls (docs/DEVELOP_PROGRAM.md Phase B, ADR-019).
 * No React/three imports so it stays unit-testable.
 *
 * Local space (docs/DOMAIN_MODEL.md): origin at the footprint centre at ground level,
 * flow along +X. Walls rise from y = 0 to y = height around the footprint edges; the
 * box is open-topped with no floor (crop rests on whatever is below — belt or ground).
 * `backstopOnly` leaves the infeed (−X) side open so crop can pile in from upstream.
 */

import type { AxisXZ } from '../../types/elements';

export interface HopperWall {
  /** Element-local centre of the wall slab. */
  center: { x: number; y: number; z: number };
  /** Full box dimensions of the wall slab. */
  size: { x: number; y: number; z: number };
}

/**
 * Wall slabs for the hopper. Back (+X) and both sides (±Z) are always present; the
 * front (−X) wall is added only when the box is fully enclosed. Side/back slabs
 * overlap at the corners (extended by one thickness) so there are no gaps.
 */
export function hopperWalls(
  footprint: AxisXZ,
  height: number,
  wallThickness: number,
  backstopOnly: boolean,
): HopperWall[] {
  const hx = footprint.x / 2;
  const hz = footprint.z / 2;
  const y = height / 2;
  const t = wallThickness;

  const walls: HopperWall[] = [
    // Back wall (+X) — the backstop.
    { center: { x: hx, y, z: 0 }, size: { x: t, y: height, z: footprint.z + t } },
    // Side walls (±Z).
    { center: { x: 0, y, z: hz }, size: { x: footprint.x + t, y: height, z: t } },
    { center: { x: 0, y, z: -hz }, size: { x: footprint.x + t, y: height, z: t } },
  ];

  if (!backstopOnly) {
    // Front wall (−X) closes the box.
    walls.push({ center: { x: -hx, y, z: 0 }, size: { x: t, y: height, z: footprint.z + t } });
  }

  return walls;
}
