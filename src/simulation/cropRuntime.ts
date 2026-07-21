/**
 * Bridges per-type CropPools to Rapier bodies bound by CropBodies (ADR-005 / Stage 9).
 * Global active count is capped at `maxActiveCrops`; each crop type has its own
 * InstancedRigidBodies pool of that capacity.
 */

import type { RapierCollider, RapierRigidBody } from '@react-three/rapier';
import { CROP_TYPES, type CropTypePreset } from '../elements/cropTypes';
import { useSimulationStore } from '../state/simulationStore';
import type { CropTypeId, Vec3 } from '../types/elements';
import { CropPool, type CropSlotId } from './CropPool';

export interface CropActivation {
  cropType: CropTypeId;
  massKg: number;
  friction: number;
  restitution: number;
  position: Vec3;
  velocity: Vec3;
}

export interface CropHandle {
  cropType: CropTypeId;
  slot: CropSlotId;
}

const PARK_Y = -100;
const CROP_TYPE_IDS = Object.keys(CROP_TYPES) as CropTypeId[];

interface TypeBucket {
  pool: CropPool;
  bodies: (RapierRigidBody | null)[];
  colliders: (RapierCollider | null)[];
  /** Approximate half-extent used for floor-contact tests. */
  contactRadii: number[];
  floorContactAt: (number | null)[];
  boundBodies: number;
}

function emptyBucket(capacity: number): TypeBucket {
  return {
    pool: new CropPool(capacity),
    bodies: Array.from({ length: capacity }, () => null),
    colliders: Array.from({ length: capacity }, () => null),
    contactRadii: Array.from({ length: capacity }, () => 0.06),
    floorContactAt: Array.from({ length: capacity }, () => null),
    boundBodies: 0,
  };
}

function contactExtent(preset: CropTypePreset): number {
  if (preset.collider.shape === 'ball') return preset.collider.radius;
  return preset.collider.halfHeight + preset.collider.radius;
}

class CropRuntime {
  private maxActive = 1;
  private globalActive = 0;
  private buckets: Record<CropTypeId, TypeBucket> = {
    wheatClump: emptyBucket(1),
    potato: emptyBucket(1),
    sugarBeet: emptyBucket(1),
  };

  get pool(): { activeCount: number; isExhausted: boolean; capacity: number } {
    return {
      activeCount: this.globalActive,
      isExhausted: this.globalActive >= this.maxActive,
      capacity: this.maxActive,
    };
  }

  /** True once every type pool has all rigid body refs bound. */
  get isBound(): boolean {
    return CROP_TYPE_IDS.every((type) => {
      const bucket = this.buckets[type];
      return bucket.boundBodies === bucket.pool.capacity && bucket.boundBodies > 0;
    });
  }

  configure(capacity: number): void {
    const already =
      this.maxActive === capacity &&
      CROP_TYPE_IDS.every((type) => this.buckets[type].boundBodies === capacity);
    if (already) return;

    this.maxActive = capacity;
    this.globalActive = 0;
    for (const type of CROP_TYPE_IDS) {
      this.buckets[type] = emptyBucket(capacity);
    }
  }

  bindSlot(
    cropType: CropTypeId,
    id: CropSlotId,
    body: RapierRigidBody | null,
    collider: RapierCollider | null,
  ): void {
    const bucket = this.buckets[cropType];
    if (id < 0 || id >= bucket.pool.capacity) return;
    bucket.bodies[id] = body;
    bucket.colliders[id] = collider;
    if (body) {
      body.setEnabled(false);
      body.setTranslation({ x: 0, y: PARK_Y - id * 0.02, z: 0 }, false);
    }
    let bound = 0;
    for (let i = 0; i < bucket.pool.capacity; i++) {
      if (bucket.bodies[i]) bound += 1;
    }
    bucket.boundBodies = bound;
  }

  private resolveCollider(bucket: TypeBucket, id: CropSlotId): RapierCollider | null {
    const existing = bucket.colliders[id];
    if (existing) return existing;
    const body = bucket.bodies[id];
    if (!body || body.numColliders() <= 0) return null;
    const collider = body.collider(0);
    bucket.colliders[id] = collider;
    return collider;
  }

  spawn(activation: CropActivation): CropHandle | null {
    if (!this.isBound) return null;
    if (this.globalActive >= this.maxActive) return null;

    const bucket = this.buckets[activation.cropType];
    const id = bucket.pool.acquire(activation.cropType, activation.massKg);
    if (id === null) return null;

    const body = bucket.bodies[id];
    const collider = this.resolveCollider(bucket, id);
    if (!body || !collider) {
      bucket.pool.release(id);
      return null;
    }

    const preset = CROP_TYPES[activation.cropType];
    collider.setFriction(activation.friction);
    collider.setRestitution(activation.restitution);
    if (preset.collider.shape === 'ball') {
      collider.setRadius(preset.collider.radius);
    } else {
      collider.setRadius(preset.collider.radius);
      collider.setHalfHeight(preset.collider.halfHeight);
    }

    body.setAdditionalMass(activation.massKg, true);
    body.setTranslation(activation.position, true);
    body.setLinvel(activation.velocity, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setEnabled(true);
    body.wakeUp();

    bucket.contactRadii[id] = contactExtent(preset);
    bucket.floorContactAt[id] = null;
    this.globalActive += 1;

    return { cropType: activation.cropType, slot: id };
  }

  release(handle: CropHandle): void {
    const bucket = this.buckets[handle.cropType];
    const slot = bucket.pool.getSlot(handle.slot);
    if (!slot.active) return;

    const body = bucket.bodies[handle.slot];
    if (body) {
      // Disable before parking so the teleport cannot shove neighbours.
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.setEnabled(false);
      body.setTranslation({ x: 0, y: PARK_Y - handle.slot * 0.02, z: 0 }, false);
    }
    bucket.floorContactAt[handle.slot] = null;
    bucket.pool.release(handle.slot);
    this.globalActive = Math.max(0, this.globalActive - 1);
  }

  reset(): void {
    for (const type of CROP_TYPE_IDS) {
      const bucket = this.buckets[type];
      for (const id of bucket.pool.activeIds()) {
        this.release({ cropType: type, slot: id });
      }
      bucket.pool.releaseAll();
    }
    this.globalActive = 0;
  }

  tickFloorDespawn(simulationTime: number, floorDespawnSeconds: number): number {
    let spilledKg = 0;
    for (const type of CROP_TYPE_IDS) {
      const bucket = this.buckets[type];
      for (const id of bucket.pool.activeIds()) {
        const body = bucket.bodies[id];
        if (!body || !body.isEnabled()) continue;

        const y = body.translation().y;
        const extent = bucket.contactRadii[id] ?? 0.06;
        const onFloor = y <= extent + 0.05;

        if (onFloor && bucket.floorContactAt[id] === null) {
          bucket.floorContactAt[id] = simulationTime;
        }

        const contactAt = bucket.floorContactAt[id];
        if (contactAt === null) continue;
        if (simulationTime - contactAt < floorDespawnSeconds) continue;

        spilledKg += bucket.pool.getSlot(id).massKg;
        this.release({ cropType: type, slot: id });
      }
    }
    return spilledKg;
  }

  /**
   * Immediate despawn for crops whose centres enter collection/despawn volumes.
   * @returns mass collected vs spilled this step
   */
  tickZoneDespawn(
    zones: ReadonlyArray<{
      kind: 'collection' | 'despawn';
      position: Vec3;
      rotationYaw: number;
      size: Vec3;
    }>,
    isInside: (
      point: Vec3,
      position: Vec3,
      yaw: number,
      size: Vec3,
    ) => boolean,
  ): { collectedKg: number; spilledKg: number } {
    let collectedKg = 0;
    let spilledKg = 0;
    if (zones.length === 0) return { collectedKg, spilledKg };

    for (const type of CROP_TYPE_IDS) {
      const bucket = this.buckets[type];
      for (const id of [...bucket.pool.activeIds()]) {
        const body = bucket.bodies[id];
        if (!body || !body.isEnabled()) continue;
        const t = body.translation();
        const point = { x: t.x, y: t.y, z: t.z };
        for (const zone of zones) {
          if (!isInside(point, zone.position, zone.rotationYaw, zone.size)) continue;
          const mass = bucket.pool.getSlot(id).massKg;
          this.release({ cropType: type, slot: id });
          if (zone.kind === 'collection') collectedKg += mass;
          else spilledKg += mass;
          break;
        }
      }
    }
    return { collectedKg, spilledKg };
  }
}

/** Process-wide runtime used by the physics step and UI reset. */
export const cropRuntime = new CropRuntime();

/** Spawn counters + accumulator clear for Toolbar Reset. */
export const cropSpawnStats = {
  massSpawnedKg: 0,
  spilledMassKg: 0,
  collectedMassKg: 0,
  statsAge: 0,
  simulationTime: 0,
  clearAccumulators: null as null | (() => void),
  reset() {
    this.massSpawnedKg = 0;
    this.spilledMassKg = 0;
    this.collectedMassKg = 0;
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
