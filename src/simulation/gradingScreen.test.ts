import { describe, expect, it } from 'vitest';
import {
  gradeFallProbability,
  gradeFallWeight,
  gradingDeckContact,
  type GradeScreenSpec,
} from './gradingScreen';

const flat: GradeScreenSpec = {
  position: { x: 0, y: 0, z: 0 },
  rotationYaw: 0,
  length: 4,
  width: 0.8,
  beltHeight: 0.75,
  inclineDeg: 0,
  apertureMm: 40,
  frontBias: 0,
};

describe('gradingDeckContact', () => {
  it('detects a crop resting on the deck and its along-fraction', () => {
    const mid = gradingDeckContact({ x: 0, y: 0.8, z: 0 }, flat);
    expect(mid.onDeck).toBe(true);
    expect(mid.alongFraction).toBeCloseTo(0.5, 10);
    expect(mid.surfaceY).toBeCloseTo(0.75, 10);

    const nearInfeed = gradingDeckContact({ x: -1.8, y: 0.8, z: 0 }, flat);
    expect(nearInfeed.onDeck).toBe(true);
    expect(nearInfeed.alongFraction).toBeCloseTo(0.05, 10);
  });

  it('rejects crops above the band, off the side, or past the ends', () => {
    expect(gradingDeckContact({ x: 0, y: 1.5, z: 0 }, flat).onDeck).toBe(false); // too high
    expect(gradingDeckContact({ x: 0, y: 0.8, z: 1 }, flat).onDeck).toBe(false); // off side
    expect(gradingDeckContact({ x: 2.5, y: 0.8, z: 0 }, flat).onDeck).toBe(false); // past discharge
  });

  it('accounts for element yaw', () => {
    const rotated: GradeScreenSpec = { ...flat, rotationYaw: Math.PI / 2 };
    // Discharge (local +X) points along world −Z under yaw +90°.
    const atDischarge = gradingDeckContact({ x: 0, y: 0.8, z: -2 }, rotated);
    expect(atDischarge.onDeck).toBe(true);
    expect(atDischarge.alongFraction).toBeCloseTo(1, 6);
  });

  it('raises the deck-surface height up an incline', () => {
    const inclined: GradeScreenSpec = { ...flat, inclineDeg: 15 };
    const atDischarge = gradingDeckContact(
      { x: 2 * Math.cos((15 * Math.PI) / 180), y: 2, z: 0 },
      inclined,
    );
    expect(atDischarge.surfaceY).toBeGreaterThan(0.75);
  });
});

describe('gradeFallWeight', () => {
  it('is even at zero bias and tilts toward the infeed for positive bias', () => {
    expect(gradeFallWeight(0, 0)).toBeCloseTo(1, 10);
    expect(gradeFallWeight(1, 0)).toBeCloseTo(1, 10);
    expect(gradeFallWeight(0, 100)).toBeCloseTo(2, 10); // infeed, full front bias
    expect(gradeFallWeight(1, 100)).toBeCloseTo(0, 10); // discharge, full front bias
    expect(gradeFallWeight(1, -100)).toBeCloseTo(2, 10); // reverse bias
  });

  it('never goes negative', () => {
    expect(gradeFallWeight(1, 200)).toBeGreaterThanOrEqual(0);
  });
});

describe('gradeFallProbability', () => {
  it('stays within [0, 1) and concentrates fall-through at the infeed under front bias', () => {
    const dt = 1 / 60;
    const pInfeed = gradeFallProbability(0, 80, dt);
    const pDischarge = gradeFallProbability(1, 80, dt);
    expect(pInfeed).toBeGreaterThan(0);
    expect(pInfeed).toBeLessThan(1);
    expect(pInfeed).toBeGreaterThan(pDischarge);
  });

  it('is uniform along the deck at zero bias', () => {
    const dt = 1 / 60;
    expect(gradeFallProbability(0, 0, dt)).toBeCloseTo(gradeFallProbability(1, 0, dt), 12);
  });
});
