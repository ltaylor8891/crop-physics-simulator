import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { BUILD_AREA_SIZE_M } from '../utilities/snap';
import { MACHINE_COLLISION_GROUPS } from './collisionGroups';
import { Materials } from './materials';

const GROUND_THICKNESS = 0.2;

/** Fixed ground collider covering the build area (docs/PHYSICS_SPECIFICATION.md). */
export function GroundCollider() {
  return (
    <RigidBody type="fixed" position={[0, -GROUND_THICKNESS / 2, 0]} colliders={false}>
      <CuboidCollider
        args={[BUILD_AREA_SIZE_M / 2, GROUND_THICKNESS / 2, BUILD_AREA_SIZE_M / 2]}
        collisionGroups={MACHINE_COLLISION_GROUPS}
        friction={Materials.ground.friction}
        restitution={Materials.ground.restitution}
      />
    </RigidBody>
  );
}
