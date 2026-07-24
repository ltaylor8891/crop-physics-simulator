import { useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { hopperWalls } from '../rendering/elements/hopperGeometry';
import { useSceneStore } from '../state/sceneStore';
import type { HopperElement } from '../types/elements';
import { MACHINE_COLLISION_GROUPS } from './collisionGroups';
import { Materials } from './materials';

/**
 * Physics colliders for placed hoppers (docs/DEVELOP_PROGRAM.md Phase B, ADR-019).
 * Passive open-top box: one `fixed` body per hopper carrying the element's yaw, with
 * a cuboid collider per wall from the shared `hopperWalls` helper. No floor.
 */
export function HopperColliders() {
  const elements = useSceneStore((s) => s.elements);
  const hoppers = useMemo(
    () => Object.values(elements).filter((el): el is HopperElement => el.type === 'hopper'),
    [elements],
  );

  return (
    <>
      {hoppers.map((hopper) => (
        <HopperCollider key={hopper.id} hopper={hopper} />
      ))}
    </>
  );
}

function HopperCollider({ hopper }: { hopper: HopperElement }) {
  const { properties, position, rotationYaw } = hopper;
  const { footprint, height, wallThickness, backstopOnly } = properties;

  const walls = useMemo(
    () => hopperWalls(footprint, height, wallThickness, backstopOnly),
    [footprint, height, wallThickness, backstopOnly],
  );

  return (
    <RigidBody
      type="fixed"
      position={[position.x, position.y, position.z]}
      rotation={[0, rotationYaw, 0]}
      colliders={false}
    >
      {walls.map((wall, i) => (
        <CuboidCollider
          key={i}
          position={[wall.center.x, wall.center.y, wall.center.z]}
          args={[wall.size.x / 2, wall.size.y / 2, wall.size.z / 2]}
          collisionGroups={MACHINE_COLLISION_GROUPS}
          friction={Materials.machine.friction}
          restitution={Materials.machine.restitution}
        />
      ))}
    </RigidBody>
  );
}
