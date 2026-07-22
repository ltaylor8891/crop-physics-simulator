import { useEffect, useMemo, useRef } from 'react';
import {
  CuboidCollider,
  RigidBody,
  useAfterPhysicsStep,
  useRapier,
  type RapierCollider,
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
  beltWorldNormal,
  beltWorldVelocity,
  isBeltTopContact,
  rotateYaw,
  velocityWithBeltSurface,
} from './beltVelocity';
import { MACHINE_COLLISION_GROUPS } from './collisionGroups';
import { Materials } from './materials';

/**
 * Physics colliders for every placed conveyor (docs/PHYSICS_SPECIFICATION.md §Conveyor).
 *
 * Mechanism (ADR-016 / ADR-006): the belt deck is a `fixed` collider. After each
 * physics step, dynamic bodies in contact have their tangential velocity set to
 * the belt surface velocity (`beltSpeed` m/min → m/s). Rapier has no dedicated
 * contact-surface-velocity API in the bound version; this matches the product
 * intent without friction slip or kinematic teleport drift.
 */
export function ConveyorColliders() {
  // Select the elements record (stable reference); filtering must not run inside
  // the Zustand selector — a new array each call causes an infinite re-render loop
  // via useSyncExternalStore ("getSnapshot should be cached").
  const elements = useSceneStore((s) => s.elements);
  const conveyors = useMemo(
    () =>
      Object.values(elements).filter(
        (element): element is ConveyorElement => element.type === 'conveyor',
      ),
    [elements],
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
  const beltColliderRef = useRef<RapierCollider>(null);
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

  const worldNormal = useMemo(
    () => beltWorldNormal(inclineDeg, rotationYaw),
    [inclineDeg, rotationYaw],
  );

  const orientation = useMemo(
    () => beltOrientationQuaternion(rotationYaw, inclineDeg),
    [rotationYaw, inclineDeg],
  );

  // Keep latest vectors for the after-step callback without re-subscribing.
  const surfaceVelRef = useRef(worldLinvel);
  const normalRef = useRef(worldNormal);
  useEffect(() => {
    surfaceVelRef.current = worldLinvel;
    normalRef.current = worldNormal;
  }, [worldLinvel, worldNormal]);

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
    const collider = beltColliderRef.current;
    if (!collider) return;

    const surfaceVel = surfaceVelRef.current;
    const speedSq =
      surfaceVel.x * surfaceVel.x +
      surfaceVel.y * surfaceVel.y +
      surfaceVel.z * surfaceVel.z;
    // Stopped belt: leave friction to hold (do not snap tangential vel to zero).
    if (speedSq < 1e-12) return;

    const normal = normalRef.current;
    world.contactPairsWith(collider, (other) => {
      const body = other.parent();
      if (!body || !body.isDynamic() || !body.isEnabled()) return;

      // Only top-surface contacts — side/end hits must not get belt speed
      // (piles near discharge / overlapping collection zones were jumping).
      let onTop = false;
      world.contactPair(collider, other, (manifold, flipped) => {
        if (manifold.numContacts() <= 0) return;
        const n = manifold.normal();
        if (isBeltTopContact(n, normal, flipped)) onTop = true;
      });
      if (!onTop) return;

      const current = body.linvel();
      const next = velocityWithBeltSurface(current, surfaceVel, normal);
      body.setLinvel(next, true);
      // Surface-velocity carriage — kill spin so crops are conveyed, not rolling.
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });
  });

  return (
    <>
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
          ref={beltColliderRef}
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
