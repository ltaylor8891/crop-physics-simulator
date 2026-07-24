/**
 * Pure geometry maths for the chute deck (docs/DEVELOP_PROGRAM.md Phase B, ADR-019).
 * No React/three imports so it stays unit-testable.
 *
 * Local space (docs/DOMAIN_MODEL.md): origin at the footprint centre at ground
 * level, flow along +X. The deck's high edge is the infeed end (−X) at `topHeight`;
 * the surface slopes down toward the discharge (+X) by `angleDeg`. The deck pivots
 * about the infeed end, mirroring the conveyor belt-slab convention.
 */

import { degreesToRadians } from '../../utilities/units';

export const CHUTE_THICKNESS = 0.06;

/**
 * Element-local centre of the chute slab collider/mesh. The slab's top face is the
 * sloped surface crops land on; the centre sits half a thickness below it along the
 * deck's local −Y (same derivation as `beltColliderLocalCenter`).
 */
export function chuteSlabCenter(
  length: number,
  topHeight: number,
  angleDeg: number,
  thickness: number = CHUTE_THICKNESS,
): { x: number; y: number; z: number } {
  // Down-slope toward +X: negative incline lowers the discharge end.
  const incline = degreesToRadians(-angleDeg);
  const half = length / 2;
  const topX = -half + half * Math.cos(incline);
  const topY = topHeight + half * Math.sin(incline);
  const halfT = thickness / 2;
  return {
    x: topX + halfT * Math.sin(incline),
    y: topY - halfT * Math.cos(incline),
    z: 0,
  };
}
