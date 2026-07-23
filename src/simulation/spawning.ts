/**
 * Spawner fixed-step emission (docs/TECHNICAL_DESIGN.md §Crop Spawning Calculation).
 * Pure — no React/Rapier. Wired from SpawningSystem on the physics step.
 *
 * Throughput uses a kg-credit accumulator so variable crop masses still match t/h.
 */

import { defaultSpawnerSizeProperties } from '../elements/cropTypes';
import type { SpawnerElement, Vec3 } from '../types/elements';
import { tonnesPerHourToKgPerSecond } from '../utilities/flow';
import { sampleCropGeometry, type RandomFn } from './cropSize';

export type { RandomFn } from './cropSize';

/** Cap leftover mass credit (kg) while throttled so recovery does not burst. */
export const THROTTLED_CREDIT_KG_CAP = 2;

/** @deprecated Crop-count throttle cap — still used by elevators. */
export const THROTTLED_ACCUMULATOR_CAP = 1;

/** Base downward emission speed (m/s). */
export const SPAWN_BASE_DOWNWARD_SPEED = 0.5;

/** Half-range of horizontal velocity jitter (m/s). */
export const SPAWN_VELOCITY_JITTER_HORIZONTAL = 0.15;

/** Half-range of vertical velocity jitter (m/s). */
export const SPAWN_VELOCITY_JITTER_VERTICAL = 0.1;

export interface SpawnerRuntimeState {
  /** Accumulated mass credit (kg) toward the next spawn(s). */
  creditKg: number;
}

export interface SpawnPose {
  position: Vec3;
  velocity: Vec3;
  radius: number;
  halfHeight: number;
  massKg: number;
  shape: 'ball' | 'capsule';
}

export interface SpawnerTickResult {
  creditKg: number;
  /** How many crops this step wants to emit (before pool throttling). */
  requested: number;
  /** Poses for each requested crop (length === requested). */
  poses: SpawnPose[];
}

export function createSpawnerRuntimeState(): SpawnerRuntimeState {
  return { creditKg: 0 };
}

/**
 * World-space position on the spawner's emission face (origin = face centre),
 * jittered uniformly across `emitArea` in local XZ then yawed into world.
 */
export function sampleEmitPosition(spawner: SpawnerElement, random: RandomFn = Math.random): Vec3 {
  const { emitArea } = spawner.properties;
  const localX = (random() - 0.5) * emitArea.x;
  const localZ = (random() - 0.5) * emitArea.z;
  const cos = Math.cos(spawner.rotationYaw);
  const sin = Math.sin(spawner.rotationYaw);
  return {
    x: spawner.position.x + localX * cos + localZ * sin,
    y: spawner.position.y,
    z: spawner.position.z - localX * sin + localZ * cos,
  };
}

/** Small downward velocity plus horizontal/vertical jitter. */
export function sampleEmitVelocity(random: RandomFn = Math.random): Vec3 {
  return {
    x: (random() - 0.5) * 2 * SPAWN_VELOCITY_JITTER_HORIZONTAL,
    y: SPAWN_BASE_DOWNWARD_SPEED * -1 + (random() - 0.5) * 2 * SPAWN_VELOCITY_JITTER_VERTICAL,
    z: (random() - 0.5) * 2 * SPAWN_VELOCITY_JITTER_HORIZONTAL,
  };
}

/**
 * Advance one spawner's mass credit for `dt` seconds and sample poses.
 * Does not touch the pool — caller acquires slots and may call `applyThrottleCreditCap`.
 */
export function tickSpawner(
  state: SpawnerRuntimeState,
  spawner: SpawnerElement,
  dtSeconds: number,
  random: RandomFn = Math.random,
): SpawnerTickResult {
  if (!spawner.properties.enabled || spawner.properties.throughput <= 0 || dtSeconds <= 0) {
    return { creditKg: state.creditKg, requested: 0, poses: [] };
  }

  let creditKg =
    state.creditKg + tonnesPerHourToKgPerSecond(spawner.properties.throughput) * dtSeconds;
  const poses: SpawnPose[] = [];

  // Safety: never emit more than a burst of bodies in one step.
  const maxPerStep = 64;
  while (poses.length < maxPerStep) {
    const geom = sampleCropGeometry(spawner.properties.cropType, spawner.properties, random);
    if (creditKg < geom.massKg) break;
    creditKg -= geom.massKg;
    poses.push({
      position: sampleEmitPosition(spawner, random),
      velocity: sampleEmitVelocity(random),
      radius: geom.radius,
      halfHeight: geom.halfHeight,
      massKg: geom.massKg,
      shape: geom.shape,
    });
  }

  return { creditKg, requested: poses.length, poses };
}

/**
 * After a partial emit due to pool exhaustion: put unmet mass back into credit
 * but cap it (docs/PHYSICS_SPECIFICATION.md §Maximum Active Bodies).
 */
export function applyThrottleCreditCap(creditKg: number, unmetMassKg: number): number {
  return Math.min(creditKg + unmetMassKg, THROTTLED_CREDIT_KG_CAP);
}

/**
 * Crop-count throttle (elevators). Caps leftover fractional credit.
 */
export function applyThrottleCap(fractionalRemainder: number, unspawnedCount: number): number {
  return Math.min(fractionalRemainder + unspawnedCount, THROTTLED_ACCUMULATOR_CAP);
}

/**
 * Simulate many fixed steps with an infinite pool; returns total mass spawned (kg)
 * and implied t/h over `durationSeconds`. Used for long-run rate acceptance tests.
 */
export function measureSpawnedMassKg(
  spawner: SpawnerElement,
  durationSeconds: number,
  dtSeconds: number,
  random: RandomFn = () => 0.5,
): { massKg: number; crops: number } {
  let state = createSpawnerRuntimeState();
  let massKg = 0;
  let crops = 0;
  const steps = Math.round(durationSeconds / dtSeconds);
  for (let i = 0; i < steps; i++) {
    const tick = tickSpawner(state, spawner, dtSeconds, random);
    state = { creditKg: tick.creditKg };
    for (const pose of tick.poses) {
      massKg += pose.massKg;
      crops += 1;
    }
  }
  return { massKg, crops };
}

/** Defaults for tests / migration helpers. */
export function spawnerSizeDefaults(cropType: SpawnerElement['properties']['cropType']) {
  return defaultSpawnerSizeProperties(cropType);
}
