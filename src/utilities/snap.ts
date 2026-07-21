import type { Vec3 } from '../types/elements';
import { degreesToRadians } from './units';

/** Grid-snap steps (docs/UI_UX_SPECIFICATION.md §Grid Snapping). */
export const POSITION_SNAP_M = 0.5;
export const ROTATION_SNAP_DEG = 15;
/** Rotation step when grid snap is off. */
export const ROTATION_FINE_DEG = 1;

/** Square build area centred on the origin (docs/UI_UX_SPECIFICATION.md). */
export const BUILD_AREA_SIZE_M = 100;

export function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Snap the horizontal components of a position; y is never snapped. */
export function snapPositionXZ(position: Vec3, enabled: boolean): Vec3 {
  if (!enabled) return position;
  return {
    x: snapToStep(position.x, POSITION_SNAP_M),
    y: position.y,
    z: snapToStep(position.z, POSITION_SNAP_M),
  };
}

/**
 * Rotate a yaw by one keyboard step (docs/UI_UX_SPECIFICATION.md §Transform Controls):
 * ±15° snapped to 15° multiples with grid snap on, ±1° freely with it off.
 */
export function stepYaw(yawRadians: number, direction: 1 | -1, gridSnap: boolean): number {
  if (gridSnap) {
    const stepped = yawRadians + direction * degreesToRadians(ROTATION_SNAP_DEG);
    const snapStep = degreesToRadians(ROTATION_SNAP_DEG);
    return snapToStep(stepped, snapStep);
  }
  return yawRadians + direction * degreesToRadians(ROTATION_FINE_DEG);
}

/**
 * True when an element footprint of `sizeX` × `sizeZ` (local space), rotated by
 * `yawRadians` and centred at `position`, lies fully inside the build area.
 * Uses the rotated bounding box, which is exact for rectangular footprints.
 */
/** Clamp a position so the rotated footprint stays inside the build area. */
export function clampToBuildArea(
  position: Vec3,
  sizeX: number,
  sizeZ: number,
  yawRadians: number,
): Vec3 {
  const cos = Math.abs(Math.cos(yawRadians));
  const sin = Math.abs(Math.sin(yawRadians));
  const halfX = (cos * sizeX + sin * sizeZ) / 2;
  const halfZ = (sin * sizeX + cos * sizeZ) / 2;
  const limit = BUILD_AREA_SIZE_M / 2;
  return {
    x: Math.min(Math.max(position.x, -limit + halfX), limit - halfX),
    y: position.y,
    z: Math.min(Math.max(position.z, -limit + halfZ), limit - halfZ),
  };
}

export function isWithinBuildArea(
  position: Vec3,
  sizeX: number,
  sizeZ: number,
  yawRadians: number,
): boolean {
  const cos = Math.abs(Math.cos(yawRadians));
  const sin = Math.abs(Math.sin(yawRadians));
  const halfX = (cos * sizeX + sin * sizeZ) / 2;
  const halfZ = (sin * sizeX + cos * sizeZ) / 2;
  const limit = BUILD_AREA_SIZE_M / 2;
  return (
    position.x - halfX >= -limit &&
    position.x + halfX <= limit &&
    position.z - halfZ >= -limit &&
    position.z + halfZ <= limit
  );
}
