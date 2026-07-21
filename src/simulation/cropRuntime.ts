/**
 * Bridges the logical CropPool to Rapier bodies bound by CropBodies.
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
  private radii: number[] = [];
  /** Simulation time of first floor contact per slot; null = not yet touched floor. */
  private floorContactAt: (number | null)[] = [];
  private boundBodies = 0;

  /** True once every pool slot has a rigid body ref (colliders may resolve lazily). */
  get isBound(): boolean {
    return this.boundBodies === this.pool.capacity && this.boundBodies > 0;
  }

  /**
   * Rebuild the logical pool when `maxActiveCrops` changes.
   * Physical refs are re-bound by CropBodies on the next layout effect.
   */
  configure(capacity: number): void {
    if (this.pool.capacity === capacity && this.boundBodies === capacity) return;
    this.pool = new CropPool(capacity);
    this.bodies = Array.from({ length: capacity }, () => null);
    this.colliders = Array.from({ length: capacity }, () => null);
    this.radii = Array.from({ length: capacity }, () => 0.06);
    this.floorContactAt = Array.from({ length: capacity }, () => null);
    this.boundBodies = 0;
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
    this.boundBodies = bound;
  }

  private resolveCollider(id: CropSlotId): RapierCollider | null {
    const existing = this.colliders[id];
    if (existing) return existing;
    const body = this.bodies[id];
    if (!body || body.numColliders() <= 0) return null;
    const collider = body.collider(0);
    this.colliders[id] = collider;
    return collider;
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
    const collider = this.resolveCollider(id);
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

    this.radii[id] = activation.radius;
    this.floorContactAt[id] = null;

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
    this.floorContactAt[id] = null;
    this.pool.release(id);
  }

  reset(): void {
    for (const id of this.pool.activeIds()) {
      this.release(id);
    }
    this.pool.releaseAll();
  }

  /**
   * Floor despawn (docs/PHYSICS_SPECIFICATION.md §Floor-Contact Detection).
   * First time an active crop rests near the ground plane (y≈0), stamp contact
   * time; after `floorDespawnSeconds` of simulation time, release and count spill.
   * @returns total mass (kg) despawned this step
   */
  tickFloorDespawn(simulationTime: number, floorDespawnSeconds: number): number {
    let spilledKg = 0;
    for (const id of this.pool.activeIds()) {
      const body = this.bodies[id];
      if (!body || !body.isEnabled()) continue;

      const y = body.translation().y;
      const radius = this.radii[id] ?? 0.06;
      // Resting on ground plane at y=0: centre ≈ radius.
      const onFloor = y <= radius + 0.05;

      if (onFloor && this.floorContactAt[id] === null) {
        this.floorContactAt[id] = simulationTime;
      }

      const contactAt = this.floorContactAt[id];
      if (contactAt === null) continue;
      if (simulationTime - contactAt < floorDespawnSeconds) continue;

      spilledKg += this.pool.getSlot(id).massKg;
      this.release(id);
    }
    return spilledKg;
  }
}

/** Process-wide runtime used by the physics step and UI reset. */
export const cropRuntime = new CropRuntime();

/** Spawn counters + accumulator clear for Toolbar Reset. */
export const cropSpawnStats = {
  massSpawnedKg: 0,
  spilledMassKg: 0,
  statsAge: 0,
  simulationTime: 0,
  clearAccumulators: null as null | (() => void),
  reset() {
    this.massSpawnedKg = 0;
    this.spilledMassKg = 0;
    this.statsAge = 0;
    this.simulationTime = 0;
    this.clearAccumulators?.();
  },
};

/** Clear pooled crops, spawn credits, and statistics. */
export function resetCropSimulation(): void {
  cropRuntime.reset();
  cropSpawnStats.reset();
  useSimulationStore.getState().resetStatistics();
}
