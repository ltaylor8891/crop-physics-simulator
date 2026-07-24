import { useEffect, useMemo, useRef } from 'react';
import {
  CuboidCollider,
  RigidBody,
  useAfterPhysicsStep,
  useRapier,
  type RapierCollider,
} from '@react-three/rapier';
import { BELT_THICKNESS } from '../rendering/elements/conveyorGeometry';
import { useSceneStore } from '../state/sceneStore';
import type { GradingScreenElement } from '../types/elements';
import { applyBeltCarry } from './beltCarry';
import {
  beltColliderLocalCenter,
  beltOrientationQuaternion,
  beltWorldNormal,
  beltWorldVelocity,
  rotateYaw,
} from './beltVelocity';
import { MACHINE_COLLISION_GROUPS } from './collisionGroups';
import { Materials } from './materials';

/**
 * Physics colliders for grading screens (docs/DEVELOP_PROGRAM.md Phase C, ADR-020).
 * The deck is a `fixed` belt collider that carries crop (shared `applyBeltCarry`); the
 * size-gated drop-through itself runs in `SpawningSystem` via `cropRuntime.tickGradingScreens`.
 */
export function GradingScreenColliders() {
  const elements = useSceneStore((s) => s.elements);
  const screens = useMemo(
    () =>
      Object.values(elements).filter(
        (el): el is GradingScreenElement => el.type === 'gradingScreen',
      ),
    [elements],
  );

  return (
    <>
      {screens.map((screen) => (
        <GradingScreenCollider key={screen.id} screen={screen} />
      ))}
    </>
  );
}

function GradingScreenCollider({ screen }: { screen: GradingScreenElement }) {
  const { properties, position, rotationYaw } = screen;
  const { length, width, beltHeight, inclineDeg, beltSpeed } = properties;
  const deckColliderRef = useRef<RapierCollider>(null);
  const { world } = useRapier();

  const homeWorld = useMemo(() => {
    const local = beltColliderLocalCenter(length, beltHeight, inclineDeg, BELT_THICKNESS);
    const rotated = rotateYaw(local, rotationYaw);
    return { x: position.x + rotated.x, y: position.y + rotated.y, z: position.z + rotated.z };
  }, [length, beltHeight, inclineDeg, rotationYaw, position.x, position.y, position.z]);

  const orientation = useMemo(
    () => beltOrientationQuaternion(rotationYaw, inclineDeg),
    [rotationYaw, inclineDeg],
  );

  const surfaceVelRef = useRef(beltWorldVelocity(beltSpeed, inclineDeg, rotationYaw));
  const normalRef = useRef(beltWorldNormal(inclineDeg, rotationYaw));
  useEffect(() => {
    surfaceVelRef.current = beltWorldVelocity(beltSpeed, inclineDeg, rotationYaw);
    normalRef.current = beltWorldNormal(inclineDeg, rotationYaw);
  }, [beltSpeed, inclineDeg, rotationYaw]);

  // Wake sleeping dynamics when a stopped deck starts (mirrors ConveyorColliders).
  const previousSpeedRef = useRef(beltSpeed);
  useEffect(() => {
    const wasStopped = previousSpeedRef.current === 0;
    previousSpeedRef.current = beltSpeed;
    if (!wasStopped || beltSpeed === 0) return;
    world.bodies.forEach((body) => {
      if (body.isDynamic() && body.isEnabled() && body.isSleeping()) body.wakeUp();
    });
  }, [beltSpeed, world]);

  useAfterPhysicsStep(() => {
    const collider = deckColliderRef.current;
    if (!collider) return;
    applyBeltCarry(world, collider, surfaceVelRef.current, normalRef.current);
  });

  return (
    <RigidBody
      type="fixed"
      position={[homeWorld.x, homeWorld.y, homeWorld.z]}
      quaternion={orientation}
      friction={Materials.belt.friction}
      restitution={Materials.belt.restitution}
      collisionGroups={MACHINE_COLLISION_GROUPS}
      colliders={false}
    >
      <CuboidCollider
        ref={deckColliderRef}
        args={[length / 2, BELT_THICKNESS / 2, width / 2]}
        collisionGroups={MACHINE_COLLISION_GROUPS}
        friction={Materials.belt.friction}
        restitution={Materials.belt.restitution}
      />
    </RigidBody>
  );
}
