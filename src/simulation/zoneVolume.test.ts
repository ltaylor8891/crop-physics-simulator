import { describe, expect, it } from 'vitest';
import { isPointInsideZone } from './zoneVolume';

describe('isPointInsideZone', () => {
  const origin = { x: 0, y: 0, z: 0 };
  const size = { x: 2, y: 2, z: 2 };

  it('contains the box centre', () => {
    expect(isPointInsideZone({ x: 0, y: 1, z: 0 }, origin, 0, size)).toBe(true);
  });

  it('rejects points outside the footprint', () => {
    expect(isPointInsideZone({ x: 1.2, y: 1, z: 0 }, origin, 0, size)).toBe(false);
  });

  it('rejects points above the box', () => {
    expect(isPointInsideZone({ x: 0, y: 2.2, z: 0 }, origin, 0, size)).toBe(false);
  });

  it('rotates with zone yaw', () => {
    const zonePos = { x: 0, y: 0, z: 0 };
    const yaw = Math.PI / 2;
    // At yaw +π/2, local +X maps to world −Z — a point on −Z is inside.
    expect(isPointInsideZone({ x: 0, y: 1, z: -0.9 }, zonePos, yaw, size)).toBe(true);
    // World +X maps to local +Z; beyond half-depth is outside.
    expect(isPointInsideZone({ x: 1.2, y: 1, z: 0 }, zonePos, yaw, size)).toBe(false);
  });
});
