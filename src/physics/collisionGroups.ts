import { interactionGroups } from '@react-three/rapier';

/**
 * Collision layers (docs/PHYSICS_SPECIFICATION.md §Collision Layers).
 * Rapier interaction groups: membership in the high 16 bits, filter in the low 16.
 */
export const CollisionGroup = {
  CROP: 0,
  MACHINE: 1,
  SENSOR: 2,
} as const;

/** Crops collide with crops, machines, and sensors. */
export const CROP_COLLISION_GROUPS = interactionGroups(
  [CollisionGroup.CROP],
  [CollisionGroup.CROP, CollisionGroup.MACHINE, CollisionGroup.SENSOR],
);

/** Machines collide only with crops (not with other machines). */
export const MACHINE_COLLISION_GROUPS = interactionGroups(
  [CollisionGroup.MACHINE],
  [CollisionGroup.CROP],
);

/** Sensors intersect crops only (sensor flag set separately on the collider). */
export const SENSOR_COLLISION_GROUPS = interactionGroups(
  [CollisionGroup.SENSOR],
  [CollisionGroup.CROP],
);
