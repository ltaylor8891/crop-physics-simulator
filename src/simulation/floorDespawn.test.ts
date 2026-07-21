import { describe, expect, it } from 'vitest';
import { CropPool } from './CropPool';

/**
 * Floor-despawn timing helper mirrored from cropRuntime (pure, no Rapier).
 * Kept here so the 3 s rule stays unit-tested without WASM.
 */
function shouldDespawn(
  floorContactAt: number | null,
  simulationTime: number,
  floorDespawnSeconds: number,
  onFloor: boolean,
): { contactAt: number | null; despawn: boolean } {
  let contactAt = floorContactAt;
  if (onFloor && contactAt === null) contactAt = simulationTime;
  if (contactAt === null) return { contactAt, despawn: false };
  return {
    contactAt,
    despawn: simulationTime - contactAt >= floorDespawnSeconds,
  };
}

describe('floor despawn timing', () => {
  it('does not despawn before the grace period', () => {
    const first = shouldDespawn(null, 1.0, 3, true);
    expect(first.contactAt).toBe(1.0);
    expect(first.despawn).toBe(false);
    const later = shouldDespawn(first.contactAt, 3.9, 3, true);
    expect(later.despawn).toBe(false);
  });

  it('despawns at exactly floorDespawnSeconds after first contact', () => {
    const result = shouldDespawn(1.0, 4.0, 3, true);
    expect(result.despawn).toBe(true);
  });

  it('keeps the original contact time if the crop leaves the floor', () => {
    const result = shouldDespawn(1.0, 4.0, 3, false);
    expect(result.contactAt).toBe(1.0);
    expect(result.despawn).toBe(true);
  });
});

describe('pool frees capacity after release (throttle recovery)', () => {
  it('allows acquire after release when previously exhausted', () => {
    const pool = new CropPool(1);
    expect(pool.acquire('potato', 0.25)).toBe(0);
    expect(pool.acquire('potato', 0.25)).toBeNull();
    pool.release(0);
    expect(pool.isExhausted).toBe(false);
    expect(pool.acquire('wheatClump', 0.03)).toBe(0);
  });
});
