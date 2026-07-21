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
 * World-space unit normal of the belt top surface (local +Y after incline + yaw).
 * Used to preserve bounce/settling while forcing tangential velocity to match the belt.
 */
export function beltWorldNormal(inclineDeg: number, yawRadians: number): Vec3 {
  const incline = degreesToRadians(inclineDeg);
  // Local +Y after pitch about Z is (−sin θ, cos θ, 0).
  return rotateYaw(
    { x: -Math.sin(incline), y: Math.cos(incline), z: 0 },
    yawRadians,
  );
}

/**
 * Replace the tangential part of `current` with `surfaceVel`, keeping the
 * component along `beltNormal` (so gravity settle / bounce still work).
 */
export function velocityWithBeltSurface(
  current: Vec3,
  surfaceVel: Vec3,
  beltNormal: Vec3,
): Vec3 {
  const vn =
    current.x * beltNormal.x + current.y * beltNormal.y + current.z * beltNormal.z;
  return {
    x: surfaceVel.x + beltNormal.x * vn,
    y: surfaceVel.y + beltNormal.y * vn,
    z: surfaceVel.z + beltNormal.z * vn,
  };
}

/**
 * True when a contact normal is a top-of-belt support contact (not a side/end hit).
 * `contactNormal` is Rapier's world normal from collider1→collider2; pass
 * `flipped` from `contactPair` so the direction is belt→other.
 */
export function isBeltTopContact(
  contactNormal: Vec3,
  beltNormal: Vec3,
  flipped: boolean,
  minAlignment = 0.55,
): boolean {
  const sign = flipped ? -1 : 1;
  const alignment =
    sign *
    (contactNormal.x * beltNormal.x +
      contactNormal.y * beltNormal.y +
      contactNormal.z * beltNormal.z);
  return alignment >= minAlignment;
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
