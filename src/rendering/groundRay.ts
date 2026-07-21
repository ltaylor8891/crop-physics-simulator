import type { Ray } from 'three';

/**
 * Intersect a pointer ray with the ground plane (y = 0).
 * Returns null when the ray points away from the plane.
 */
export function intersectGround(ray: Ray): { x: number; z: number } | null {
  if (ray.direction.y === 0) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (!Number.isFinite(t) || t <= 0) return null;
  return {
    x: ray.origin.x + ray.direction.x * t,
    z: ray.origin.z + ray.direction.z * t,
  };
}
