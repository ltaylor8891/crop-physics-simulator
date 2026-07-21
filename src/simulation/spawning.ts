/**
 * Spawner fixed-step emission (docs/TECHNICAL_DESIGN.md §Crop Spawning Calculation).
 * Pure — no React/Rapier. Wired from SpawningSystem on the physics step.
 */

import { CROP_TYPES } from '../elements/cropTypes';
import type { SpawnerElement, Vec3 } from '../types/elements';
import { advanceSpawnAccumulator, cropsPerSecond } from '../utilities/flow';

/** Cap leftover fractional credit while throttled so recovery does not burst. */
export const THROTTLED_ACCUMULATOR_CAP = 1;

/** Base downward emission speed (m/s). */
export const SPAWN_BASE_DOWNWARD_SPEED = 0.5;

/** Half-range of horizontal velocity jitter (m/s). */
export const SPAWN_VELOCITY_JITTER_HORIZONTAL = 0.15;

/** Half-range of vertical velocity jitter (m/s). */
export const SPAWN_VELOCITY_JITTER_VERTICAL = 0.1;

export interface SpawnerRuntimeState {
  accumulator: number;
}

export interface SpawnPose {
  position: Vec3;
  velocity: Vec3;
}

export interface SpawnerTickResult {
  accumulator: number;
  /** How many crops this step wants to emit (before pool throttling). */
  requested: number;
  /** Poses for each requested crop (length === requested). */
  poses: SpawnPose[];
}

export function createSpawnerRuntimeState(): SpawnerRuntimeState {
  return { accumulator: 0 };
}

/** Uniform sample in [0, 1). Injected for deterministic tests. */
export type RandomFn = () => number;

/**
 * World-space position on the spawner's emission face (origin = face centre),
 * jittered uniformly across `emitArea` in local XZ then yawed into world.
 */
export function sampleEmitPosition(
  spawner: SpawnerElement,
  random: RandomFn = Math.random,
): Vec3 {
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
 * Advance one spawner's fractional accumulator for `dt` seconds.
 * Does not touch the pool — caller acquires slots and may call `applyThrottleCap`.
 */
export function tickSpawner(
  state: SpawnerRuntimeState,
  spawner: SpawnerElement,
  dtSeconds: number,
  random: RandomFn = Math.random,
): SpawnerTickResult {
  if (!spawner.properties.enabled || spawner.properties.throughput <= 0 || dtSeconds <= 0) {
    return { accumulator: state.accumulator, requested: 0, poses: [] };
  }

  const preset = CROP_TYPES[spawner.properties.cropType];
  const rate = cropsPerSecond(spawner.properties.throughput, preset.mass);
  const { spawnCount, accumulator } = advanceSpawnAccumulator(
    state.accumulator,
    rate,
    dtSeconds,
  );

  const poses: SpawnPose[] = [];
  for (let i = 0; i < spawnCount; i++) {
    poses.push({
      position: sampleEmitPosition(spawner, random),
      velocity: sampleEmitVelocity(random),
    });
  }

  return { accumulator, requested: spawnCount, poses };
}

/**
 * After a partial emit due to pool exhaustion: put unspawned credit back into the
 * accumulator but cap it (docs/PHYSICS_SPECIFICATION.md §Maximum Active Bodies).
 */
export function applyThrottleCap(
  fractionalRemainder: number,
  unspawnedCount: number,
): number {
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
  const preset = CROP_TYPES[spawner.properties.cropType];
  let state = createSpawnerRuntimeState();
  let crops = 0;
  const steps = Math.round(durationSeconds / dtSeconds);
  for (let i = 0; i < steps; i++) {
    const tick = tickSpawner(state, spawner, dtSeconds, random);
    state = { accumulator: tick.accumulator };
    crops += tick.requested;
  }
  return { massKg: crops * preset.mass, crops };
}
