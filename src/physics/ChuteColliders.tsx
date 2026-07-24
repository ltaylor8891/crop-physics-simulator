import { useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { CHUTE_THICKNESS, chuteSlabCenter } from '../rendering/elements/chuteGeometry';
import { useSceneStore } from '../state/sceneStore';
import type { ChuteElement } from '../types/elements';
import { beltOrientationQuaternion, rotateYaw } from './beltVelocity';
import { MACHINE_COLLISION_GROUPS } from './collisionGroups';
import { Materials } from './materials';

/**
 * Physics colliders for placed chutes (docs/DEVELOP_PROGRAM.md Phase B, ADR-019).
 * A chute is a single passive `fixed` slab pitched down toward the discharge — no
 * contact velocity, so crops slide by gravity and friction alone.
 */
export function ChuteColliders() {
  const elements = useSceneStore((s) => s.elements);
  const chutes = useMemo(
    () => Object.values(elements).filter((el): el is ChuteElement => el.type === 'chute'),
    [elements],
  );

  return (
    <>
      {chutes.map((chute) => (
        <ChuteCollider key={chute.id} chute={chute} />
      ))}
    </>
  );
}

function ChuteCollider({ chute }: { chute: ChuteElement }) {
  const { properties, position, rotationYaw } = chute;
  const { length, width, angleDeg, topHeight } = properties;

  const world = useMemo(() => {
    const local = chuteSlabCenter(length, topHeight, angleDeg);
    const rotated = rotateYaw(local, rotationYaw);
    return { x: position.x + rotated.x, y: position.y + rotated.y, z: position.z + rotated.z };
  }, [length, topHeight, angleDeg, rotationYaw, position.x, position.y, position.z]);

  // Yaw about +Y, then the down-slope pitch about local Z (negative lowers discharge).
  const orientation = useMemo(
    () => beltOrientationQuaternion(rotationYaw, -angleDeg),
    [rotationYaw, angleDeg],
  );

  return (
    <RigidBody
      type="fixed"
      position={[world.x, world.y, world.z]}
      quaternion={orientation}
      colliders={false}
    >
      <CuboidCollider
        args={[length / 2, CHUTE_THICKNESS / 2, width / 2]}
        collisionGroups={MACHINE_COLLISION_GROUPS}
        friction={Materials.machine.friction}
        restitution={Materials.machine.restitution}
      />
    </RigidBody>
  );
}
