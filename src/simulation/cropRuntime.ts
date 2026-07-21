/**
 * Bridges the logical CropPool to Rapier bodies / meshes bound by CropBodies.
 * Accessed from the fixed physics step (SpawningSystem) and Toolbar reset.
 */

import type { RapierCollider, RapierRigidBody } from '@react-three/rapier';
import { useSimulationStore } from '../state/simulationStore';
import type { CropTypeId, Vec3 } from '../types/elements';
import { CropPool, type CropSlotId } from './CropPool';

export interface CropActivation {
  cropType: CropTypeId;
  massKg: number;
  friction: number;
  restitution: number;
  radius: number;
  color: string;
  position: Vec3;
  velocity: Vec3;
}

const PARK_Y = -100;

class CropRuntime {
  pool: CropPool = new CropPool(1);
  private bodies: (RapierRigidBody | null)[] = [];
  private colliders: (RapierCollider | null)[] = [];
  private boundCapacity = 0;

  /** True once CropBodies has registered refs for the current capacity. */
  get isBound(): boolean {
    return this.boundCapacity === this.pool.capacity && this.boundCapacity > 0;
  }

  /**
   * Rebuild the logical pool when `maxActiveCrops` changes.
   * Physical refs are re-bound by CropBodies on the next layout effect.
   */
  configure(capacity: number): void {
    if (this.pool.capacity === capacity && this.boundCapacity === capacity) return;
    this.pool = new CropPool(capacity);
    this.bodies = Array.from({ length: capacity }, () => null);
    this.colliders = Array.from({ length: capacity }, () => null);
    this.boundCapacity = 0;
  }

  bindSlot(
    id: CropSlotId,
    body: RapierRigidBody | null,
    collider: RapierCollider | null,
  ): void {
    if (id < 0 || id >= this.pool.capacity) return;
    this.bodies[id] = body;
    this.colliders[id] = collider;
    if (body) {
      body.setEnabled(false);
      body.setTranslation({ x: 0, y: PARK_Y - id * 0.02, z: 0 }, false);
    }
    let bound = 0;
    for (let i = 0; i < this.pool.capacity; i++) {
      if (this.bodies[i]) bound += 1;
    }
    this.boundCapacity = bound;
  }

  /**
   * Acquire a pool slot and enable the corresponding Rapier body.
   * Returns null when the pool is exhausted or bodies are not ready.
   */
  spawn(activation: CropActivation): CropSlotId | null {
    if (!this.isBound) return null;
    const id = this.pool.acquire(activation.cropType, activation.massKg);
    if (id === null) return null;

    const body = this.bodies[id];
    const collider = this.colliders[id];
    if (!body || !collider) {
      this.pool.release(id);
      return null;
    }

    collider.setRadius(activation.radius);
    collider.setFriction(activation.friction);
    collider.setRestitution(activation.restitution);

    body.setAdditionalMass(activation.massKg, true);
    body.setTranslation(activation.position, true);
    body.setLinvel(activation.velocity, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setEnabled(true);
    body.wakeUp();

    return id;
  }

  release(id: CropSlotId): void {
    const body = this.bodies[id];
    if (body) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.setTranslation({ x: 0, y: PARK_Y - id * 0.02, z: 0 }, true);
      body.setEnabled(false);
    }
    this.pool.release(id);
  }

  reset(): void {
    for (const id of this.pool.activeIds()) {
      this.release(id);
    }
    this.pool.releaseAll();
  }
}

/** Process-wide runtime used by the physics step and UI reset. */
export const cropRuntime = new CropRuntime();

/** Spawn counters + accumulator clear for Toolbar Reset. */
export const cropSpawnStats = {
  massSpawnedKg: 0,
  statsAge: 0,
  clearAccumulators: null as null | (() => void),
  reset() {
    this.massSpawnedKg = 0;
    this.statsAge = 0;
    this.clearAccumulators?.();
  },
};

/** Clear pooled crops, spawn credits, and statistics. */
export function resetCropSimulation(): void {
  cropRuntime.reset();
  cropSpawnStats.reset();
  useSimulationStore.getState().resetStatistics();
}
