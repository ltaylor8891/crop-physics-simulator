import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BallCollider,
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier';
import type { InstancedMesh } from 'three';
import { cropRuntime } from '../simulation/cropRuntime';
import { useSimulationStore } from '../state/simulationStore';
import { CROP_COLLISION_GROUPS } from './collisionGroups';

const DEFAULT_RADIUS = 0.06;
const PARK_Y = -100;

/**
 * Pre-allocated crop rigid bodies via InstancedRigidBodies (ADR-005).
 * Stage 8: shared ball mesh; potato capsules approximated as balls.
 * Stage 9: per-type InstancedMesh + proper capsule colliders.
 */
export function CropBodies() {
  const capacity = useSimulationStore((s) => s.settings.maxActiveCrops);
  const bodiesRef = useRef<(RapierRigidBody | null)[] | null>(null);
  const meshRef = useRef<InstancedMesh>(null);

  const instances: InstancedRigidBodyProps[] = useMemo(
    () =>
      Array.from({ length: capacity }, (_, id) => ({
        key: id,
        position: [0, PARK_Y - id * 0.02, 0] as [number, number, number],
      })),
    [capacity],
  );

  useLayoutEffect(() => {
    cropRuntime.configure(capacity);
  }, [capacity]);

  useLayoutEffect(() => {
    const bodies = bodiesRef.current;
    if (!bodies || bodies.length !== capacity) return;

    for (let id = 0; id < capacity; id++) {
      const body = bodies[id] ?? null;
      const collider =
        body && body.numColliders() > 0 ? body.collider(0) : null;
      cropRuntime.bindSlot(id, body, collider);
    }

    const mesh = meshRef.current;
    if (mesh) mesh.count = capacity;

    return () => {
      for (let id = 0; id < capacity; id++) {
        cropRuntime.bindSlot(id, null, null);
      }
    };
  }, [capacity, instances]);

  return (
    <InstancedRigidBodies
      ref={bodiesRef}
      instances={instances}
      type="dynamic"
      colliders={false}
      ccd
      collisionGroups={CROP_COLLISION_GROUPS}
      colliderNodes={[
        <BallCollider
          key="crop-ball"
          args={[DEFAULT_RADIUS]}
          collisionGroups={CROP_COLLISION_GROUPS}
          friction={0.5}
          restitution={0.15}
        />,
      ]}
    >
      <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} castShadow>
        <sphereGeometry args={[DEFAULT_RADIUS, 10, 10]} />
        <meshStandardMaterial color="#d9b45b" />
      </instancedMesh>
    </InstancedRigidBodies>
  );
}
