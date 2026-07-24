import { describe, expect, it } from 'vitest';
import { degreesToRadians } from '../../utilities/units';
import {
  BELT_THICKNESS,
  beltTopHeightAt,
  computeChevronPositions,
  computeLegs,
  DIVERTER_HEIGHT,
  diverterLocalCenter,
  diverterPlacement,
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

describe('diverterPlacement', () => {
  it('positions the wall from the infeed end along the belt', () => {
    expect(diverterPlacement(6, 0, 0).innerX).toBeCloseTo(-3, 10); // infeed end
    expect(diverterPlacement(6, 3, 0).innerX).toBeCloseTo(0, 10); // belt centre
    expect(diverterPlacement(6, 6, 0).innerX).toBeCloseTo(3, 10); // discharge end
  });

  it('sits the wall centre half its height above the belt surface', () => {
    expect(diverterPlacement(6, 2, 0).innerY).toBeCloseTo(DIVERTER_HEIGHT / 2, 10);
  });

  it('shifts the wall across the belt by the lateral offset', () => {
    expect(diverterPlacement(6, 2, 0).innerZ).toBe(0);
    expect(diverterPlacement(6, 2, 0.5).innerZ).toBeCloseTo(0.5, 10);
    expect(diverterPlacement(6, 2, -0.5).innerZ).toBeCloseTo(-0.5, 10);
  });
});

describe('diverterLocalCenter', () => {
  it('on a flat belt sits above the belt top at the offset position', () => {
    const c = diverterLocalCenter(6, 0.75, 0, 3, 0);
    expect(c.x).toBeCloseTo(0, 10); // -3 + 3
    expect(c.y).toBeCloseTo(0.75 + DIVERTER_HEIGHT / 2, 10);
    expect(c.z).toBe(0);
  });

  it('rises with the belt line up an incline', () => {
    const flat = diverterLocalCenter(6, 0.75, 0, 4, 0);
    const inclined = diverterLocalCenter(6, 0.75, degreesToRadians(20), 4, 0);
    // Same along-belt offset, but the pitched deck lifts the wall centre higher.
    expect(inclined.y).toBeGreaterThan(flat.y);
    // Its horizontal reach shortens as the belt tilts up (cos projection).
    expect(inclined.x).toBeLessThan(flat.x);
  });

  it('carries the lateral offset onto the local Z axis, independent of incline', () => {
    expect(diverterLocalCenter(6, 0.75, 0, 3, 0.4).z).toBeCloseTo(0.4, 10);
    expect(diverterLocalCenter(6, 0.75, degreesToRadians(25), 3, -0.4).z).toBeCloseTo(-0.4, 10);
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
