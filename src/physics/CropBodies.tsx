import { useEffect, useMemo, useRef } from 'react';
import {
  BallCollider,
  CapsuleCollider,
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier';
import type { InstancedMesh } from 'three';
import { CROP_TYPES } from '../elements/cropTypes';
import { cropRuntime } from '../simulation/cropRuntime';
import { useSimulationStore } from '../state/simulationStore';
import type { CropTypeId } from '../types/elements';
import { CROP_COLLISION_GROUPS } from './collisionGroups';

const PARK_Y = -100;
const CROP_TYPE_IDS = Object.keys(CROP_TYPES) as CropTypeId[];

/** Small damping to settle piles (docs/PHYSICS_SPECIFICATION.md). */
const CROP_LINEAR_DAMPING = 0.05;

/**
 * Pre-allocated crop rigid bodies — one InstancedRigidBodies pool per crop type
 * (docs/ROADMAP.md §Stage 9 / ADR-005). Global active count is capped at maxActiveCrops.
 */
export function CropBodies() {
  const capacity = useSimulationStore((s) => s.settings.maxActiveCrops);

  useEffect(() => {
    cropRuntime.configure(capacity);
  }, [capacity]);

  return (
    <>
      {CROP_TYPE_IDS.map((cropType) => (
        <CropTypePool key={cropType} cropType={cropType} capacity={capacity} />
      ))}
    </>
  );
}

function CropTypePool({
  cropType,
  capacity,
}: {
  cropType: CropTypeId;
  capacity: number;
}) {
  const preset = CROP_TYPES[cropType];
  const bodiesRef = useRef<(RapierRigidBody | null)[] | null>(null);
  const meshRef = useRef<InstancedMesh>(null);

  const instances: InstancedRigidBodyProps[] = useMemo(
    () =>
      Array.from({ length: capacity }, (_, id) => ({
        key: `${cropType}-${id}`,
        position: [0, PARK_Y - id * 0.02, 0] as [number, number, number],
      })),
    [capacity, cropType],
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const tryBind = (): boolean => {
      const bodies = bodiesRef.current;
      if (!bodies) return false;

      let ready = 0;
      for (let id = 0; id < capacity; id++) {
        const body = bodies[id] ?? null;
        if (!body) {
          cropRuntime.bindSlot(cropType, id, null, null);
          continue;
        }
        const collider = body.numColliders() > 0 ? body.collider(0) : null;
        cropRuntime.bindSlot(cropType, id, body, collider);
        if (collider) ready += 1;
      }

      const mesh = meshRef.current;
      if (mesh) {
        mesh.count = capacity;
        mesh.frustumCulled = false;
      }

      return ready === capacity;
    };

    if (!tryBind()) {
      timer = setInterval(() => {
        if (cancelled) return;
        if (tryBind() && timer !== undefined) {
          clearInterval(timer);
          timer = undefined;
        }
      }, 50);
    }

    return () => {
      cancelled = true;
      if (timer !== undefined) clearInterval(timer);
      for (let id = 0; id < capacity; id++) {
        cropRuntime.bindSlot(cropType, id, null, null);
      }
    };
  }, [capacity, cropType, instances]);

  const colliderNode =
    preset.collider.shape === 'ball' ? (
      <BallCollider
        key={`${cropType}-ball`}
        args={[preset.collider.radius]}
        collisionGroups={CROP_COLLISION_GROUPS}
        friction={preset.friction}
        restitution={preset.restitution}
      />
    ) : (
      <CapsuleCollider
        key={`${cropType}-capsule`}
        args={[preset.collider.halfHeight, preset.collider.radius]}
        collisionGroups={CROP_COLLISION_GROUPS}
        friction={preset.friction}
        restitution={preset.restitution}
      />
    );

  return (
    <InstancedRigidBodies
      ref={bodiesRef}
      instances={instances}
      type="dynamic"
      colliders={false}
      ccd
      linearDamping={CROP_LINEAR_DAMPING}
      collisionGroups={CROP_COLLISION_GROUPS}
      colliderNodes={[colliderNode]}
    >
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, capacity]}
        castShadow
        frustumCulled={false}
      >
        {preset.collider.shape === 'ball' ? (
          <sphereGeometry args={[preset.collider.radius, 10, 10]} />
        ) : (
          <capsuleGeometry
            args={[preset.collider.radius, preset.collider.halfHeight * 2, 4, 8]}
          />
        )}
        <meshStandardMaterial color={preset.color} />
      </instancedMesh>
    </InstancedRigidBodies>
  );
}
