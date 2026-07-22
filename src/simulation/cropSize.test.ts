import { describe, expect, it } from 'vitest';
import { CROP_TYPES, sphereVolumeM3 } from '../elements/cropTypes';
import {
  biasExponent,
  clampDiameterRangeMm,
  clampLengthPct,
  defaultCropGeometry,
  geometryFromSize,
  sampleBiasedRange,
  sampleCropGeometry,
} from './cropSize';

describe('biasExponent', () => {
  it('is 1 for zero bias', () => {
    expect(biasExponent(0)).toBe(1);
  });

  it('favours low end when negative', () => {
    expect(biasExponent(-100)).toBeGreaterThan(1);
  });

  it('favours high end when positive', () => {
    expect(biasExponent(100)).toBeLessThan(1);
  });
});

describe('sampleBiasedRange', () => {
  it('stays within bounds', () => {
    for (let i = 0; i < 50; i++) {
      const v = sampleBiasedRange(20, 150, 0, () => i / 50);
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(150);
    }
  });

  it('returns endpoint when min equals max', () => {
    expect(sampleBiasedRange(40, 40, 50, () => 0.9)).toBe(40);
  });
});

describe('clampDiameterRangeMm', () => {
  it('clamps potato into 20–150', () => {
    expect(clampDiameterRangeMm('potato', 10, 200)).toEqual({
      diameterMinMm: 20,
      diameterMaxMm: 150,
    });
  });

  it('swaps inverted ranges after clamp', () => {
    const r = clampDiameterRangeMm('potato', 140, 30);
    expect(r.diameterMinMm).toBeLessThanOrEqual(r.diameterMaxMm);
  });
});

describe('clampLengthPct', () => {
  it('clamps to 0–100', () => {
    expect(clampLengthPct(-10, 150)).toEqual({ lengthMinPct: 0, lengthMaxPct: 100 });
  });
});

describe('geometryFromSize', () => {
  it('ball uses sphere volume', () => {
    const g = geometryFromSize(CROP_TYPES.wheatClump, 0.08, 50, 1000);
    expect(g.shape).toBe('ball');
    expect(g.radius).toBeCloseTo(0.04, 10);
    expect(g.halfHeight).toBe(0);
    expect(g.volumeM3).toBeCloseTo(sphereVolumeM3(0.04), 10);
    expect(g.massKg).toBeCloseTo(1000 * g.volumeM3, 10);
  });

  it('capsule 0% length is a sphere (L=0 ≤ D)', () => {
    const g = geometryFromSize(CROP_TYPES.potato, 0.1, 0, 800);
    expect(g.shape).toBe('capsule');
    expect(g.halfHeight).toBe(0);
    expect(g.volumeM3).toBeCloseTo(sphereVolumeM3(0.05), 10);
  });

  it('capsule 100% length is a sphere (L = D)', () => {
    const g = geometryFromSize(CROP_TYPES.potato, 0.1, 100, 800);
    expect(g.halfHeight).toBe(0);
    expect(g.volumeM3).toBeCloseTo(sphereVolumeM3(0.05), 10);
  });
});

describe('sampleCropGeometry', () => {
  it('respects potato diameter limits', () => {
    const g = sampleCropGeometry(
      'potato',
      {
        diameterMinMm: 20,
        diameterMaxMm: 150,
        diameterBias: 0,
        lengthMinPct: 0,
        lengthMaxPct: 100,
        lengthBias: 0,
        densityKgPerM3: CROP_TYPES.potato.defaultDensityKgPerM3,
      },
      () => 0.5,
    );
    expect(g.radius).toBeGreaterThan(0);
    expect(g.massKg).toBeGreaterThan(0);
  });
});

describe('defaultCropGeometry', () => {
  it('uses mid diameter and type density', () => {
    const g = defaultCropGeometry('potato');
    const midMm = (20 + 150) / 2;
    expect(g.radius).toBeCloseTo(midMm / 2000, 6);
    expect(g.massKg).toBeGreaterThan(0);
  });
});
