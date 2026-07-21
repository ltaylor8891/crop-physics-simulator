import { describe, expect, it } from 'vitest';
import { degreesToRadians, radiansToDegrees } from './units';
import { clampToBuildArea, isWithinBuildArea, snapPositionXZ, snapToStep, stepYaw } from './snap';

describe('units', () => {
  it('converts degrees to radians and back', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 12);
    expect(radiansToDegrees(degreesToRadians(37.5))).toBeCloseTo(37.5, 12);
  });
});

describe('snapToStep', () => {
  it('snaps to the nearest multiple', () => {
    expect(snapToStep(1.24, 0.5)).toBe(1.0);
    expect(snapToStep(1.26, 0.5)).toBe(1.5);
    expect(snapToStep(-0.74, 0.5)).toBe(-0.5);
  });
});

describe('snapPositionXZ', () => {
  it('snaps x and z to 0.5 m but never y', () => {
    const snapped = snapPositionXZ({ x: 3.2, y: 1.87, z: -4.9 }, true);
    expect(snapped).toEqual({ x: 3.0, y: 1.87, z: -5.0 });
  });

  it('is a no-op when snapping is disabled', () => {
    const position = { x: 3.2, y: 1.87, z: -4.9 };
    expect(snapPositionXZ(position, false)).toEqual(position);
  });
});

describe('stepYaw', () => {
  it('steps by 15° and snaps to 15° multiples with grid snap on', () => {
    const from7deg = stepYaw(degreesToRadians(7), 1, true);
    expect(radiansToDegrees(from7deg)).toBeCloseTo(15, 10);
    const back = stepYaw(degreesToRadians(30), -1, true);
    expect(radiansToDegrees(back)).toBeCloseTo(15, 10);
  });

  it('steps by 1° without snapping when grid snap is off', () => {
    const stepped = stepYaw(degreesToRadians(7.2), 1, false);
    expect(radiansToDegrees(stepped)).toBeCloseTo(8.2, 10);
  });
});

describe('clampToBuildArea', () => {
  it('leaves interior positions unchanged', () => {
    const position = { x: 10, y: 0, z: -4 };
    expect(clampToBuildArea(position, 6, 0.8, 0)).toEqual(position);
  });

  it('pulls edge-crossing positions back inside by the footprint half-extent', () => {
    const clamped = clampToBuildArea({ x: 60, y: 0, z: 0 }, 6, 0.8, 0);
    expect(clamped.x).toBeCloseTo(47, 10);
    expect(clamped.z).toBe(0);
  });
});

describe('isWithinBuildArea', () => {
  it('accepts a small element at the origin', () => {
    expect(isWithinBuildArea({ x: 0, y: 0, z: 0 }, 6, 0.8, 0)).toBe(true);
  });

  it('rejects an element whose footprint crosses the edge', () => {
    expect(isWithinBuildArea({ x: 48, y: 0, z: 0 }, 6, 0.8, 0)).toBe(false);
  });

  it('accounts for rotation of long elements near the edge', () => {
    // A 6 m conveyor ending exactly at the +X edge fits at yaw 0…
    expect(isWithinBuildArea({ x: 47, y: 0, z: 0 }, 6, 0.8, 0)).toBe(true);
    // …and still fits when rotated to run along the edge.
    expect(isWithinBuildArea({ x: 47, y: 0, z: 0 }, 6, 0.8, Math.PI / 2)).toBe(true);
    // But a 45° rotation extends the bounding box past the edge.
    expect(isWithinBuildArea({ x: 48.5, y: 0, z: 0 }, 6, 0.8, Math.PI / 4)).toBe(false);
  });
});
