import { useEffect, useMemo, useRef } from 'react';
import {
  CuboidCollider,
  RigidBody,
  useAfterPhysicsStep,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import {
  BELT_THICKNESS,
  SKIRT_HEIGHT,
  SKIRT_THICKNESS,
} from '../rendering/elements/conveyorGeometry';
import { useSceneStore } from '../state/sceneStore';
import type { ConveyorElement, Vec3 } from '../types/elements';
import { degreesToRadians } from '../utilities/units';
import {
  beltColliderLocalCenter,
  beltOrientationQuaternion,
  beltWorldVelocity,
  rotateYaw,
} from './beltVelocity';
import { MACHINE_COLLISION_GROUPS } from './collisionGroups';
import { Materials } from './materials';

/**
 * Physics colliders for every placed conveyor (docs/PHYSICS_SPECIFICATION.md §Conveyor).
 *
 * Mechanism (ADR-006 / KI-002): each belt is a `kinematicVelocity` body whose
 * linear velocity equals the belt surface velocity. After every physics step the
 * body is pinned back to its home translation so the mesh never drifts — contacts
 * still see the tangential velocity. Rapier has no dedicated contact-surface-velocity
 * API in the bound version; this is the supported equivalent.
 */
export function ConveyorColliders() {
  const conveyors = useSceneStore((s) =>
    Object.values(s.elements).filter(
      (element): element is ConveyorElement => element.type === 'conveyor',
    ),
  );

  return (
    <>
      {conveyors.map((conveyor) => (
        <ConveyorCollider key={conveyor.id} conveyor={conveyor} />
      ))}
    </>
  );
}

function ConveyorCollider({ conveyor }: { conveyor: ConveyorElement }) {
  const { properties, position, rotationYaw } = conveyor;
  const { length, width, beltHeight, inclineDeg, beltSpeed, skirts } = properties;
  const beltRef = useRef<RapierRigidBody>(null);
  const { world } = useRapier();

  const localCenter = useMemo(
    () => beltColliderLocalCenter(length, beltHeight, inclineDeg, BELT_THICKNESS),
    [length, beltHeight, inclineDeg],
  );

  const homeWorld = useMemo(() => {
    const rotated = rotateYaw(localCenter, rotationYaw);
    return {
      x: position.x + rotated.x,
      y: position.y + rotated.y,
      z: position.z + rotated.z,
    };
  }, [localCenter, position.x, position.y, position.z, rotationYaw]);

  const worldLinvel = useMemo(
    () => beltWorldVelocity(beltSpeed, inclineDeg, rotationYaw),
    [beltSpeed, inclineDeg, rotationYaw],
  );

  const orientation = useMemo(
    () => beltOrientationQuaternion(rotationYaw, inclineDeg),
    [rotationYaw, inclineDeg],
  );

  // Wake sleeping dynamics when a stopped belt starts (ADR-006).
  const previousSpeedRef = useRef(beltSpeed);
  useEffect(() => {
    const wasStopped = previousSpeedRef.current === 0;
    previousSpeedRef.current = beltSpeed;
    if (!wasStopped || beltSpeed === 0) return;
    world.bodies.forEach((body) => {
      if (body.isDynamic() && body.isSleeping()) body.wakeUp();
    });
  }, [beltSpeed, world]);

  useAfterPhysicsStep(() => {
    const body = beltRef.current;
    if (!body) return;
    body.setTranslation(homeWorld, true);
    body.setLinvel(worldLinvel, true);
  });

  return (
    <>
      <RigidBody
        ref={beltRef}
        type="kinematicVelocity"
        position={[homeWorld.x, homeWorld.y, homeWorld.z]}
        quaternion={orientation}
        linearVelocity={[worldLinvel.x, worldLinvel.y, worldLinvel.z]}
        friction={Materials.belt.friction}
        restitution={Materials.belt.restitution}
        collisionGroups={MACHINE_COLLISION_GROUPS}
        colliders={false}
      >
        <CuboidCollider
          args={[length / 2, BELT_THICKNESS / 2, width / 2]}
          collisionGroups={MACHINE_COLLISION_GROUPS}
          friction={Materials.belt.friction}
          restitution={Materials.belt.restitution}
        />
      </RigidBody>

      {skirts &&
        ([-1, 1] as const).map((side) => {
          const skirtLocal = skirtLocalCenter(length, width, beltHeight, inclineDeg, side);
          const worldPos = rotateYaw(skirtLocal, rotationYaw);
          return (
            <RigidBody
              key={side}
              type="fixed"
              position={[position.x + worldPos.x, position.y + worldPos.y, position.z + worldPos.z]}
              quaternion={orientation}
              colliders={false}
            >
              <CuboidCollider
                args={[length / 2, SKIRT_HEIGHT / 2, SKIRT_THICKNESS / 2]}
                collisionGroups={MACHINE_COLLISION_GROUPS}
                friction={Materials.machine.friction}
                restitution={Materials.machine.restitution}
              />
            </RigidBody>
          );
        })}
    </>
  );
}

/** Element-local centre of a side skirt (above the belt top, pitched with the belt). */
function skirtLocalCenter(
  length: number,
  width: number,
  beltHeight: number,
  inclineDeg: number,
  side: -1 | 1,
): Vec3 {
  const incline = degreesToRadians(inclineDeg);
  const half = length / 2;
  const midBelt = {
    x: -half + half * Math.cos(incline),
    y: beltHeight + half * Math.sin(incline),
    z: side * (width / 2 + SKIRT_THICKNESS / 2),
  };
  // Local +Y after pitch about Z is (−sin θ, cos θ, 0).
  const up = SKIRT_HEIGHT / 2;
  return {
    x: midBelt.x - up * Math.sin(incline),
    y: midBelt.y + up * Math.cos(incline),
    z: midBelt.z,
  };
}
