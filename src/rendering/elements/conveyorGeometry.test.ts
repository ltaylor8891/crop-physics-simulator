import { describe, expect, it } from 'vitest';
import { degreesToRadians } from '../../utilities/units';
import {
  BELT_THICKNESS,
  beltTopHeightAt,
  computeChevronPositions,
  computeLegs,
  RAIL_HEIGHT,
} from './conveyorGeometry';

describe('beltTopHeightAt', () => {
  it('keeps the infeed end at beltHeight regardless of incline (pivot at infeed)', () => {
    expect(beltTopHeightAt(0.75, degreesToRadians(15), 0)).toBe(0.75);
    expect(beltTopHeightAt(0.75, degreesToRadians(-15), 0)).toBe(0.75);
  });

  it('raises the discharge end by length·sin(incline)', () => {
    const incline = degreesToRadians(15);
    expect(beltTopHeightAt(0.75, incline, 6)).toBeCloseTo(0.75 + 6 * Math.sin(incline), 10);
  });

  it('is flat at zero incline', () => {
    expect(beltTopHeightAt(0.75, 0, 6)).toBe(0.75);
  });
});

describe('computeLegs', () => {
  it('produces vertical legs reaching the belt underside on a flat conveyor', () => {
    const legs = computeLegs(6, 0.75, 0);
    expect(legs.length).toBeGreaterThanOrEqual(2);
    for (const leg of legs) {
      expect(leg.height).toBeCloseTo(0.75 - (BELT_THICKNESS + RAIL_HEIGHT), 10);
      expect(Math.abs(leg.x)).toBeLessThanOrEqual(3);
    }
  });

  it('makes legs progressively taller up an incline', () => {
    const legs = computeLegs(6, 0.75, degreesToRadians(15));
    for (let i = 1; i < legs.length; i++) {
      expect(legs[i].height).toBeGreaterThan(legs[i - 1].height);
      expect(legs[i].x).toBeGreaterThan(legs[i - 1].x);
    }
  });

  it('skips legs where a declined belt runs too close to the ground', () => {
    // Steep decline from a low belt: far end dips near/below ground level.
    const legs = computeLegs(10, 0.3, degreesToRadians(-20));
    const flatLegs = computeLegs(10, 0.3, 0);
    expect(legs.length).toBeLessThan(flatLegs.length);
  });
});

describe('computeChevronPositions', () => {
  it('spaces chevrons evenly within the belt', () => {
    const positions = computeChevronPositions(6);
    expect(positions).toHaveLength(4);
    expect(positions[0]).toBeCloseTo(-2.25, 10);
    expect(positions[3]).toBeCloseTo(2.25, 10);
  });

  it('always yields at least one chevron on short belts', () => {
    expect(computeChevronPositions(1)).toEqual([0]);
  });
});
