import type { RapierCollider } from '@react-three/rapier';
import { isBeltTopContact, velocityWithBeltSurface, type Vec3 } from './beltVelocity';

/** Rapier world type, derived without a runtime import. */
type RapierWorld = ReturnType<typeof import('@react-three/rapier').useRapier>['world'];

/**
 * Inject a belt surface velocity into dynamic bodies resting on `deckCollider`'s top
 * face (ADR-016). Shared by conveyors and grading screens — the belt deck stays a
 * `fixed` collider; after each step, top-surface contacts have their tangential
 * velocity set to `surfaceVel` (the component along `normal` is preserved so gravity
 * settle / bounce still work). A stopped belt (near-zero `surfaceVel`) is a no-op so
 * friction holds riders instead of snapping them to zero.
 */
export function applyBeltCarry(
  world: RapierWorld,
  deckCollider: RapierCollider,
  surfaceVel: Vec3,
  normal: Vec3,
): void {
  const speedSq =
    surfaceVel.x * surfaceVel.x + surfaceVel.y * surfaceVel.y + surfaceVel.z * surfaceVel.z;
  if (speedSq < 1e-12) return;

  world.contactPairsWith(deckCollider, (other) => {
    const body = other.parent();
    if (!body || !body.isDynamic() || !body.isEnabled()) return;

    // Only top-surface contacts get belt speed (side/end hits must not).
    let onTop = false;
    world.contactPair(deckCollider, other, (manifold, flipped) => {
      if (manifold.numContacts() <= 0) return;
      if (isBeltTopContact(manifold.normal(), normal, flipped)) onTop = true;
    });
    if (!onTop) return;

    const next = velocityWithBeltSurface(body.linvel(), surfaceVel, normal);
    body.setLinvel(next, true);
    // Surface-velocity carriage — kill spin so crops are conveyed, not rolling.
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  });
}
