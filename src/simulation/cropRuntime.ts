/**
 * Bridges per-type CropPools to Rapier bodies bound by CropBodies (ADR-005 / Stage 9).
 * Global active count is capped at `maxActiveCrops`; each crop type has its own
 * InstancedRigidBodies pool of that capacity.
 */

import type { RapierCollider, RapierRigidBody } from '@react-three/rapier';
import { Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { CROP_TYPES, sphereVolumeM3 } from '../elements/cropTypes';
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
  /** Collider radius (m) */
  radius: number;
  /** Capsule half-height (m); 0 for balls / spheres */
  halfHeight: number;
}

export interface CropHandle {
  cropType: CropTypeId;
  slot: CropSlotId;
}

const PARK_Y = -100;
/** Reference mesh/collider size in CropBodies — visuals scale relative to this. */
export const CROP_MESH_REF_RADIUS = 0.05;
export const CROP_MESH_REF_HALF_HEIGHT = 0.05;
/** Rapier rejects / destabilises zero-length capsules. */
const MIN_CAPSULE_HALF_HEIGHT = 1e-3;

const CROP_TYPE_IDS = Object.keys(CROP_TYPES) as CropTypeId[];
const _mat = new Matrix4();
const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3();

interface TypeBucket {
  pool: CropPool;
  bodies: (RapierRigidBody | null)[];
  colliders: (RapierCollider | null)[];
  /** Approximate half-extent used for floor-contact tests. */
  contactRadii: number[];
  /** Visual scale relative to CROP_MESH_REF_* geometry. */
  scaleX: number[];
  scaleY: number[];
  scaleZ: number[];
  floorContactAt: (number | null)[];
  boundBodies: number;
  mesh: InstancedMesh | null;
}

function emptyBucket(capacity: number): TypeBucket {
  return {
    pool: new CropPool(capacity),
    bodies: Array.from({ length: capacity }, () => null),
    colliders: Array.from({ length: capacity }, () => null),
    contactRadii: Array.from({ length: capacity }, () => CROP_MESH_REF_RADIUS),
    scaleX: Array.from({ length: capacity }, () => 0),
    scaleY: Array.from({ length: capacity }, () => 0),
    scaleZ: Array.from({ length: capacity }, () => 0),
    floorContactAt: Array.from({ length: capacity }, () => null),
    boundBodies: 0,
    mesh: null,
  };
}

function visualScale(radius: number, halfHeight: number, shape: 'ball' | 'capsule'): {
  x: number;
  y: number;
  z: number;
} {
  const r = Math.max(1e-4, radius);
  const sx = r / CROP_MESH_REF_RADIUS;
  if (shape === 'ball' || halfHeight < MIN_CAPSULE_HALF_HEIGHT) {
    return { x: sx, y: sx, z: sx };
  }
  return {
    x: sx,
    y: Math.max(MIN_CAPSULE_HALF_HEIGHT, halfHeight) / CROP_MESH_REF_HALF_HEIGHT,
    z: sx,
  };
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

  /** True once every type pool has all rigid body + collider refs bound. */
  get isBound(): boolean {
    return CROP_TYPE_IDS.every((type) => {
      const bucket = this.buckets[type];
      if (bucket.boundBodies !== bucket.pool.capacity || bucket.boundBodies <= 0) {
        return false;
      }
      for (let i = 0; i < bucket.pool.capacity; i++) {
        if (!bucket.colliders[i]) return false;
      }
      return true;
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

  bindMesh(cropType: CropTypeId, mesh: InstancedMesh | null): void {
    this.buckets[cropType].mesh = mesh;
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
    bucket.scaleX[id] = 0;
    bucket.scaleY[id] = 0;
    bucket.scaleZ[id] = 0;
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

  private writeInstanceMatrix(
    mesh: InstancedMesh,
    id: CropSlotId,
    x: number,
    y: number,
    z: number,
    qx: number,
    qy: number,
    qz: number,
    qw: number,
    sx: number,
    sy: number,
    sz: number,
  ): void {
    _pos.set(x, y, z);
    _quat.set(qx, qy, qz, qw);
    _scale.set(sx, sy, sz);
    _mat.compose(_pos, _quat, _scale);
    mesh.setMatrixAt(id, _mat);
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
    const radius = Math.max(1e-4, activation.radius);
    // Physics colliders are balls (InstancedRigidBodies colliders="ball").
    // Capsule halfHeight is visual-only for potato meshes.
    const visualHalfHeight =
      preset.collider.shape === 'capsule'
        ? Math.max(MIN_CAPSULE_HALF_HEIGHT, activation.halfHeight)
        : 0;

    collider.setFriction(activation.friction);
    collider.setRestitution(activation.restitution);
    collider.setRadius(radius);
    // Density from mass/volume so Rapier gets correct mass + inertia for contacts.
    const volumeM3 = sphereVolumeM3(radius);
    const density = activation.massKg / Math.max(volumeM3, 1e-12);
    collider.setDensity(density);

    body.setTranslation(activation.position, true);
    body.setLinvel(activation.velocity, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setEnabled(true);
    body.wakeUp();

    const shape = preset.collider.shape === 'ball' ? 'ball' : 'capsule';
    const scale = visualScale(radius, visualHalfHeight, shape);
    bucket.scaleX[id] = scale.x;
    bucket.scaleY[id] = scale.y;
    bucket.scaleZ[id] = scale.z;
    bucket.contactRadii[id] = radius;
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
    bucket.scaleX[handle.slot] = 0;
    bucket.scaleY[handle.slot] = 0;
    bucket.scaleZ[handle.slot] = 0;
    bucket.pool.release(handle.slot);
    this.globalActive = Math.max(0, this.globalActive - 1);

    const mesh = bucket.mesh;
    if (mesh) {
      this.writeInstanceMatrix(
        mesh,
        handle.slot,
        0,
        PARK_Y - handle.slot * 0.02,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
      );
      mesh.instanceMatrix.needsUpdate = true;
    }
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

  /**
   * Drive instance matrices from body pose + stored scale (after Rapier/Instanced sync).
   * Inactive slots stay at scale 0 so unit/ref meshes never appear as a giant blob.
   */
  syncInstanceScales(cropType: CropTypeId): void {
    const bucket = this.buckets[cropType];
    const mesh = bucket.mesh;
    if (!mesh) return;

    const capacity = bucket.pool.capacity;
    for (let id = 0; id < capacity; id++) {
      const body = bucket.bodies[id];
      const active = bucket.pool.getSlot(id).active;
      if (!body || !active) {
        this.writeInstanceMatrix(
          mesh,
          id,
          0,
          PARK_Y - id * 0.02,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
        );
        continue;
      }

      const t = body.translation();
      const r = body.rotation();
      this.writeInstanceMatrix(
        mesh,
        id,
        t.x,
        t.y,
        t.z,
        r.x,
        r.y,
        r.z,
        r.w,
        bucket.scaleX[id]!,
        bucket.scaleY[id]!,
        bucket.scaleZ[id]!,
      );
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  tickFloorDespawn(simulationTime: number, floorDespawnSeconds: number): number {
    let spilledKg = 0;
    for (const type of CROP_TYPE_IDS) {
      const bucket = this.buckets[type];
      for (const id of bucket.pool.activeIds()) {
        const body = bucket.bodies[id];
        if (!body || !body.isEnabled()) continue;

        const y = body.translation().y;
        const extent = bucket.contactRadii[id] ?? CROP_MESH_REF_RADIUS;
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

  /**
   * Release crops whose centres enter elevator intake volumes.
   * First matching elevator wins; returns intakes for transit enqueue.
   */
  tickElevatorIntake(
    intakes: ReadonlyArray<{
      elevatorId: string;
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
  ): Array<{ elevatorId: string; cropType: CropTypeId }> {
    const accepted: Array<{ elevatorId: string; cropType: CropTypeId }> = [];
    if (intakes.length === 0) return accepted;

    for (const type of CROP_TYPE_IDS) {
      const bucket = this.buckets[type];
      for (const id of [...bucket.pool.activeIds()]) {
        const body = bucket.bodies[id];
        if (!body || !body.isEnabled()) continue;
        const t = body.translation();
        const point = { x: t.x, y: t.y, z: t.z };
        for (const intake of intakes) {
          if (!isInside(point, intake.position, intake.rotationYaw, intake.size)) {
            continue;
          }
          this.release({ cropType: type, slot: id });
          accepted.push({ elevatorId: intake.elevatorId, cropType: type });
          break;
        }
      }
    }
    return accepted;
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
