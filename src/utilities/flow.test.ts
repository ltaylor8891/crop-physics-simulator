import { describe, expect, it } from 'vitest';
import {
  advanceSpawnAccumulator,
  cropsPerSecond,
  kgPerSecondToTonnesPerHour,
  metresPerMinuteToMetresPerSecond,
  tonnesPerHourToKgPerSecond,
} from './flow';

describe('tonnesPerHourToKgPerSecond', () => {
  it('converts 1 t/h to 1000/3600 kg/s', () => {
    expect(tonnesPerHourToKgPerSecond(1)).toBeCloseTo(0.27778, 4);
  });

  it('converts 36 t/h to exactly 10 kg/s', () => {
    expect(tonnesPerHourToKgPerSecond(36)).toBe(10);
  });

  it('is zero for zero flow', () => {
    expect(tonnesPerHourToKgPerSecond(0)).toBe(0);
  });

  it('round-trips with kgPerSecondToTonnesPerHour', () => {
    expect(kgPerSecondToTonnesPerHour(tonnesPerHourToKgPerSecond(123.45))).toBeCloseTo(123.45, 10);
  });
});

describe('cropsPerSecond', () => {
  it('matches the documented potato example: 10 t/h of 0.5 kg crops ≈ 5.56 crops/s', () => {
    expect(cropsPerSecond(10, 0.5)).toBeCloseTo(5.5556, 3);
  });

  it('matches the documented wheat example: 10 t/h of 0.03 kg clumps ≈ 92.6 crops/s', () => {
    expect(cropsPerSecond(10, 0.03)).toBeCloseTo(92.593, 2);
  });

  it('rejects non-positive crop mass', () => {
    expect(() => cropsPerSecond(10, 0)).toThrow(RangeError);
    expect(() => cropsPerSecond(10, -1)).toThrow(RangeError);
  });
});

describe('metresPerMinuteToMetresPerSecond', () => {
  it('converts 90 m/min to 1.5 m/s', () => {
    expect(metresPerMinuteToMetresPerSecond(90)).toBe(1.5);
  });

  it('converts the belt-speed maximum 300 m/min to 5 m/s', () => {
    expect(metresPerMinuteToMetresPerSecond(300)).toBe(5);
  });
});

describe('advanceSpawnAccumulator', () => {
  it('spawns nothing until a whole crop accumulates', () => {
    const step = advanceSpawnAccumulator(0, 2, 1 / 60);
    expect(step.spawnCount).toBe(0);
    expect(step.accumulator).toBeCloseTo(2 / 60, 12);
  });

  it('carries the fractional remainder across spawns', () => {
    const step = advanceSpawnAccumulator(0.9, 30, 1 / 60); // +0.5 → 1.4
    expect(step.spawnCount).toBe(1);
    expect(step.accumulator).toBeCloseTo(0.4, 12);
  });

  it('spawns multiple crops per step at high rates', () => {
    const step = advanceSpawnAccumulator(0, 300, 1 / 60); // +5
    expect(step.spawnCount).toBe(5);
    expect(step.accumulator).toBeCloseTo(0, 12);
  });

  it('achieves the exact long-run average rate', () => {
    // 7.3 crops/s for 60 simulated seconds at 1/60 steps.
    const rate = 7.3;
    const dt = 1 / 60;
    let accumulator = 0;
    let spawned = 0;
    for (let i = 0; i < 3600; i++) {
      const step = advanceSpawnAccumulator(accumulator, rate, dt);
      accumulator = step.accumulator;
      spawned += step.spawnCount;
    }
    expect(spawned).toBeGreaterThanOrEqual(Math.floor(rate * 60) - 1);
    expect(spawned).toBeLessThanOrEqual(Math.ceil(rate * 60));
  });
});
