import { degreesToRadians } from '../utilities/units';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * World-space belt surface velocity (docs/PHYSICS_SPECIFICATION.md §Conveyor Surface Velocity).
 *
 * Magnitude = beltSpeed (m/min) converted to m/s. Direction follows the belt's
 * local +X after pitch (incline about local Z) and yaw (about world +Y), matching
 * three.js right-handed Y-up: yaw 0 → +X, yaw +π/2 → −Z.
 */
export function beltWorldVelocity(
  beltSpeedMPerMin: number,
  inclineDeg: number,
  yawRadians: number,
): Vec3 {
  const speed = beltSpeedMPerMin / 60;
  const incline = degreesToRadians(inclineDeg);
  const alongBelt = Math.cos(incline); // horizontal component in the belt's pitch plane
  return {
    x: speed * alongBelt * Math.cos(yawRadians),
    y: speed * Math.sin(incline),
    z: speed * alongBelt * -Math.sin(yawRadians),
  };
}

/**
 * World-space centre of the belt slab collider (element origin at footprint centre,
 * yaw applied separately by the RigidBody). Matches ConveyorMesh geometry: the belt
 * pivots about the infeed end at `beltHeight`, and the collider centre sits half a
 * belt-thickness below the top surface along the belt's local −Y.
 */
export function beltColliderLocalCenter(
  length: number,
  beltHeight: number,
  inclineDeg: number,
  beltThickness: number,
): Vec3 {
  const incline = degreesToRadians(inclineDeg);
  const half = length / 2;
  const topX = -half + half * Math.cos(incline);
  const topY = beltHeight + half * Math.sin(incline);
  const halfT = beltThickness / 2;
  // Local −Y after pitch about Z is (sin θ, −cos θ, 0).
  return {
    x: topX + halfT * Math.sin(incline),
    y: topY - halfT * Math.cos(incline),
    z: 0,
  };
}

/** Rotate an element-local offset into world space by yaw about +Y (three.js convention). */
export function rotateYaw(local: Vec3, yawRadians: number): Vec3 {
  const cos = Math.cos(yawRadians);
  const sin = Math.sin(yawRadians);
  return {
    x: local.x * cos + local.z * sin,
    y: local.y,
    z: -local.x * sin + local.z * cos,
  };
}

/**
 * Quaternion for conveyor orientation: yaw about world +Y, then incline about
 * the belt's local +Z (same composition as ConveyorMesh's nested groups).
 * Returns [x, y, z, w] for three.js / Rapier.
 */
export function beltOrientationQuaternion(
  yawRadians: number,
  inclineDeg: number,
): [number, number, number, number] {
  const hy = yawRadians / 2;
  const hi = degreesToRadians(inclineDeg) / 2;
  const cy = Math.cos(hy);
  const sy = Math.sin(hy);
  const ci = Math.cos(hi);
  const si = Math.sin(hi);
  // q = q_yaw * q_incline_z
  return [sy * si, sy * ci, cy * si, cy * ci];
}
