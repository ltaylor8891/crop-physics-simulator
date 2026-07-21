import { describe, expect, it } from 'vitest';
import {
  beltColliderLocalCenter,
  beltOrientationQuaternion,
  beltWorldNormal,
  beltWorldVelocity,
  isBeltTopContact,
  rotateYaw,
  velocityWithBeltSurface,
} from './beltVelocity';

describe('beltWorldVelocity', () => {
  it('converts 90 m/min on a flat belt at yaw 0 to 1.5 m/s along +X', () => {
    const v = beltWorldVelocity(90, 0, 0);
    expect(v.x).toBeCloseTo(1.5, 10);
    expect(v.y).toBeCloseTo(0, 10);
    expect(v.z).toBeCloseTo(0, 10);
  });

  it('points along −Z at yaw +π/2 (three.js Y-up convention)', () => {
    const v = beltWorldVelocity(60, 0, Math.PI / 2);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.y).toBe(0);
    expect(v.z).toBeCloseTo(-1, 10);
  });

  it('pitches the velocity vector with the belt incline', () => {
    const inclineDeg = 30;
    const v = beltWorldVelocity(60, inclineDeg, 0);
    const incline = (inclineDeg * Math.PI) / 180;
    expect(v.x).toBeCloseTo(Math.cos(incline), 10);
    expect(v.y).toBeCloseTo(Math.sin(incline), 10);
    expect(v.z).toBeCloseTo(0, 10);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 10);
  });

  it('is zero when the belt is stopped', () => {
    const v = beltWorldVelocity(0, 15, Math.PI / 4);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.y).toBeCloseTo(0, 10);
    expect(v.z).toBeCloseTo(0, 10);
  });

  it('maps 60 m/min to exactly 1 m/s', () => {
    const v = beltWorldVelocity(60, 0, 0);
    expect(v.x).toBeCloseTo(1, 10);
  });
});

describe('beltWorldNormal', () => {
  it('is world +Y on a flat belt', () => {
    const n = beltWorldNormal(0, 0);
    expect(n.x).toBeCloseTo(0, 10);
    expect(n.y).toBeCloseTo(1, 10);
    expect(n.z).toBeCloseTo(0, 10);
  });

  it('pitches with the belt incline', () => {
    const inclineDeg = 30;
    const n = beltWorldNormal(inclineDeg, 0);
    const incline = (inclineDeg * Math.PI) / 180;
    expect(n.x).toBeCloseTo(-Math.sin(incline), 10);
    expect(n.y).toBeCloseTo(Math.cos(incline), 10);
    expect(n.z).toBeCloseTo(0, 10);
  });
});

describe('velocityWithBeltSurface', () => {
  it('forces flat-belt XZ speed while preserving vertical velocity', () => {
    const next = velocityWithBeltSurface(
      { x: 0.1, y: -2, z: 0.2 },
      { x: 1.5, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    expect(next.x).toBeCloseTo(1.5, 10);
    expect(next.y).toBeCloseTo(-2, 10);
    expect(next.z).toBeCloseTo(0, 10);
  });

  it('leaves an already-matched rider unchanged', () => {
    const surface = { x: Math.cos(Math.PI / 6), y: Math.sin(Math.PI / 6), z: 0 };
    const normal = { x: -Math.sin(Math.PI / 6), y: Math.cos(Math.PI / 6), z: 0 };
    const next = velocityWithBeltSurface(surface, surface, normal);
    expect(next.x).toBeCloseTo(surface.x, 10);
    expect(next.y).toBeCloseTo(surface.y, 10);
    expect(next.z).toBeCloseTo(surface.z, 10);
  });
});

describe('isBeltTopContact', () => {
  const up = { x: 0, y: 1, z: 0 };

  it('accepts a contact normal aligned with the belt up', () => {
    expect(isBeltTopContact({ x: 0, y: 1, z: 0 }, up, false)).toBe(true);
  });

  it('rejects a side-hit normal', () => {
    expect(isBeltTopContact({ x: 1, y: 0, z: 0 }, up, false)).toBe(false);
  });

  it('accounts for a flipped manifold', () => {
    // Normal reported as crop→belt (−Y); flipped restores belt→crop.
    expect(isBeltTopContact({ x: 0, y: -1, z: 0 }, up, true)).toBe(true);
  });
});

describe('beltColliderLocalCenter', () => {
  it('centres a flat belt half a thickness below beltHeight', () => {
    const center = beltColliderLocalCenter(6, 0.75, 0, 0.08);
    expect(center.x).toBeCloseTo(0, 10);
    expect(center.y).toBeCloseTo(0.75 - 0.04, 10);
    expect(center.z).toBe(0);
  });

  it('raises the centre with positive incline (pivot at infeed)', () => {
    const flat = beltColliderLocalCenter(6, 0.75, 0, 0.08);
    const inclined = beltColliderLocalCenter(6, 0.75, 15, 0.08);
    expect(inclined.y).toBeGreaterThan(flat.y);
    expect(inclined.x).toBeLessThan(flat.x); // centre shifts toward infeed in ground-X
  });
});

describe('rotateYaw', () => {
  it('rotates local +X to −Z at yaw +π/2', () => {
    const rotated = rotateYaw({ x: 1, y: 2, z: 0 }, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 10);
    expect(rotated.y).toBe(2);
    expect(rotated.z).toBeCloseTo(-1, 10);
  });
});

describe('beltOrientationQuaternion', () => {
  it('is pure yaw when incline is zero', () => {
    const yaw = Math.PI / 2;
    const [x, y, z, w] = beltOrientationQuaternion(yaw, 0);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(Math.sin(yaw / 2), 10);
    expect(z).toBeCloseTo(0, 10);
    expect(w).toBeCloseTo(Math.cos(yaw / 2), 10);
  });

  it('is pure Z rotation when yaw is zero', () => {
    const inclineDeg = 30;
    const hi = (inclineDeg * Math.PI) / 180 / 2;
    const [x, y, z, w] = beltOrientationQuaternion(0, inclineDeg);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(Math.sin(hi), 10);
    expect(w).toBeCloseTo(Math.cos(hi), 10);
  });
});
