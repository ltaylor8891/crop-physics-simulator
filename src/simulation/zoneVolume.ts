/**
 * Axis-aligned zone tests in element-local space after inverse yaw
 * (docs/DOMAIN_MODEL.md §Collection Zone / Despawn Zone).
 */

import type { Vec3 } from '../types/elements';

/**
 * True if `worldPoint` lies inside the zone box.
 * Zone origin = footprint centre at base; box centre at local (0, size.y/2, 0).
 */
export function isPointInsideZone(
  worldPoint: Vec3,
  zonePosition: Vec3,
  zoneYawRadians: number,
  size: Vec3,
): boolean {
  const dx = worldPoint.x - zonePosition.x;
  const dy = worldPoint.y - zonePosition.y;
  const dz = worldPoint.z - zonePosition.z;

  const cos = Math.cos(-zoneYawRadians);
  const sin = Math.sin(-zoneYawRadians);
  const localX = dx * cos + dz * sin;
  const localZ = -dx * sin + dz * cos;
  const localY = dy;

  const hx = size.x / 2;
  const hy = size.y / 2;
  const hz = size.z / 2;
  const cy = size.y / 2;

  return (
    localX >= -hx &&
    localX <= hx &&
    localY >= cy - hy &&
    localY <= cy + hy &&
    localZ >= -hz &&
    localZ <= hz
  );
}
