import { describe, expect, it } from 'vitest';
import { hopperWalls } from './hopperGeometry';

describe('hopperWalls', () => {
  it('produces four walls for a fully enclosed hopper', () => {
    const walls = hopperWalls({ x: 2, z: 3 }, 1, 0.1, false);
    expect(walls).toHaveLength(4);
    // Every wall spans the full height, open-topped (centre at height/2), no floor.
    for (const w of walls) {
      expect(w.center.y).toBeCloseTo(0.5, 10);
      expect(w.size.y).toBeCloseTo(1, 10);
    }
    const backAtPlusX = walls.some((w) => Math.abs(w.center.x - 1) < 1e-9 && w.center.z === 0);
    const frontAtMinusX = walls.some((w) => Math.abs(w.center.x + 1) < 1e-9 && w.center.z === 0);
    const sideAtPlusZ = walls.some((w) => Math.abs(w.center.z - 1.5) < 1e-9 && w.center.x === 0);
    const sideAtMinusZ = walls.some((w) => Math.abs(w.center.z + 1.5) < 1e-9 && w.center.x === 0);
    expect(backAtPlusX && frontAtMinusX && sideAtPlusZ && sideAtMinusZ).toBe(true);
  });

  it('omits the infeed (−X) wall in backstop-only mode', () => {
    const walls = hopperWalls({ x: 2, z: 3 }, 1, 0.1, true);
    expect(walls).toHaveLength(3);
    const frontAtMinusX = walls.some((w) => Math.abs(w.center.x + 1) < 1e-9 && w.center.z === 0);
    const backAtPlusX = walls.some((w) => Math.abs(w.center.x - 1) < 1e-9 && w.center.z === 0);
    expect(frontAtMinusX).toBe(false);
    expect(backAtPlusX).toBe(true);
  });

  it('overlaps side and back walls at the corners (extended by one thickness)', () => {
    const walls = hopperWalls({ x: 2, z: 3 }, 1, 0.1, false);
    const back = walls.find((w) => Math.abs(w.center.x - 1) < 1e-9)!;
    const side = walls.find((w) => Math.abs(w.center.z - 1.5) < 1e-9)!;
    expect(back.size.z).toBeCloseTo(3 + 0.1, 10);
    expect(side.size.x).toBeCloseTo(2 + 0.1, 10);
  });
});
