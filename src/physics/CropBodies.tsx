import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import type { InstancedMesh } from 'three';
import { CROP_TYPES } from '../elements/cropTypes';
import { CROP_MESH_REF_RADIUS, cropRuntime } from '../simulation/cropRuntime';
import { useSimulationStore } from '../state/simulationStore';
import type { CropTypeId } from '../types/elements';
import { CROP_COLLISION_GROUPS } from './collisionGroups';

const PARK_Y = -100;
const CROP_TYPE_IDS = Object.keys(CROP_TYPES) as CropTypeId[];

/** Small damping to settle piles (docs/PHYSICS_SPECIFICATION.md). */
const CROP_LINEAR_DAMPING = 0.05;

/**
 * Pre-allocated crop rigid bodies — one InstancedMesh + Rapier pool per crop type.
 *
 * Bodies are created via the Rapier world API (not InstancedRigidBodies). The R3F
 * wrapper registers every instance in a per-frame mesh sync, including disabled
 * parked slots (~3 × maxActiveCrops), which stayed expensive after Reset.
 *
 * Physics and visuals are balls sized to the sampled radius (length% ≤ 100 keeps
 * potatoes spherical). cropRuntime sets density on spawn.
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
  const meshRef = useRef<InstancedMesh>(null);
  const { world, rapier } = useRapier();

  useEffect(() => {
    const bodies: RapierRigidBody[] = [];
    const colliders: RapierCollider[] = [];

    for (let id = 0; id < capacity; id++) {
      const bodyDesc = rapier.RigidBodyDesc.dynamic()
        .setTranslation(0, PARK_Y - id * 0.02, 0)
        .setEnabled(false)
        .setCcdEnabled(true)
        .setLinearDamping(CROP_LINEAR_DAMPING)
        .setAngularDamping(0.5);
      const body = world.createRigidBody(bodyDesc);
      const colliderDesc = rapier.ColliderDesc.ball(CROP_MESH_REF_RADIUS)
        .setFriction(preset.friction)
        .setRestitution(preset.restitution)
        .setCollisionGroups(CROP_COLLISION_GROUPS)
        .setSolverGroups(CROP_COLLISION_GROUPS);
      const collider = world.createCollider(colliderDesc, body);
      bodies.push(body);
      colliders.push(collider);
      cropRuntime.bindSlot(cropType, id, body, collider);
    }

    const mesh = meshRef.current;
    cropRuntime.bindMesh(cropType, mesh);
    if (mesh) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      cropRuntime.clearInstanceMatrices(cropType);
    }

    return () => {
      cropRuntime.bindMesh(cropType, null);
      for (let id = 0; id < capacity; id++) {
        cropRuntime.bindSlot(cropType, id, null, null);
      }
      for (const body of bodies) {
        if (world.getRigidBody(body.handle)) {
          world.removeRigidBody(body);
        }
      }
    };
  }, [capacity, cropType, preset.friction, preset.restitution, rapier, world]);

  // Own the instance matrices — active slots only (see cropRuntime.syncInstanceScales).
  useFrame(() => {
    cropRuntime.syncInstanceScales(cropType);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, capacity]}
      castShadow
      frustumCulled={false}
    >
      <sphereGeometry args={[CROP_MESH_REF_RADIUS, 10, 10]} />
      <meshStandardMaterial color={preset.color} />
    </instancedMesh>
  );
}
