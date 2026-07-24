import { describe, expect, it } from 'vitest';
import { CHUTE_THICKNESS, chuteSlabCenter } from './chuteGeometry';

describe('chuteSlabCenter', () => {
  it('a flat deck sits half a thickness below its top edge at topHeight', () => {
    const c = chuteSlabCenter(2, 1, 0);
    expect(c.x).toBeCloseTo(0, 10);
    expect(c.y).toBeCloseTo(1 - CHUTE_THICKNESS / 2, 10);
    expect(c.z).toBe(0);
  });

  it('slopes the deck down toward the discharge (centre drops with angle)', () => {
    const flat = chuteSlabCenter(3, 1.2, 0);
    const gentle = chuteSlabCenter(3, 1.2, 15);
    const steep = chuteSlabCenter(3, 1.2, 45);
    expect(gentle.y).toBeLessThan(flat.y);
    expect(steep.y).toBeLessThan(gentle.y);
    // Down-slope shortens the horizontal reach (cos projection), like the diverter.
    expect(steep.x).toBeLessThan(0);
    expect(steep.z).toBe(0);
  });
});
