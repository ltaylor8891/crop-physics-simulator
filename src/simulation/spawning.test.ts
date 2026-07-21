import { describe, expect, it } from 'vitest';
import { CROP_TYPES } from '../elements/cropTypes';
import type { SpawnerElement } from '../types/elements';
import { kgPerSecondToTonnesPerHour, tonnesPerHourToKgPerSecond } from '../utilities/flow';
import {
  applyThrottleCap,
  createSpawnerRuntimeState,
  measureSpawnedMassKg,
  sampleEmitPosition,
  sampleEmitVelocity,
  tickSpawner,
  THROTTLED_ACCUMULATOR_CAP,
} from './spawning';

function makeSpawner(overrides?: Partial<SpawnerElement['properties']>): SpawnerElement {
  return {
    id: 'spawner-1',
    type: 'spawner',
    name: 'Spawner 1',
    position: { x: 1, y: 2, z: 3 },
    rotationYaw: 0,
    properties: {
      cropType: 'potato',
      throughput: 40,
      emitArea: { x: 0.6, z: 0.6 },
      enabled: true,
      ...overrides,
    },
  };
}

describe('tickSpawner', () => {
  it('emits nothing when disabled', () => {
    const state = createSpawnerRuntimeState();
    const tick = tickSpawner(state, makeSpawner({ enabled: false }), 1 / 60);
    expect(tick.requested).toBe(0);
    expect(tick.poses).toHaveLength(0);
  });

  it('accumulates fractional crops across steps', () => {
    const spawner = makeSpawner({ throughput: 36, cropType: 'potato' }); // 10 kg/s / 0.25 = 40 crops/s
    let state = createSpawnerRuntimeState();
    // 40/60 ≈ 0.666 per step — first step no spawn
    let tick = tickSpawner(state, spawner, 1 / 60, () => 0.5);
    expect(tick.requested).toBe(0);
    state = { accumulator: tick.accumulator };
    tick = tickSpawner(state, spawner, 1 / 60, () => 0.5);
    expect(tick.requested).toBe(1);
  });
});

describe('measureSpawnedMassKg (acceptance: long-run rate within 1%)', () => {
  it('matches configured t/h within 1% over 60 s', () => {
    const throughput = 40;
    const spawner = makeSpawner({ throughput, cropType: 'potato' });
    const duration = 60;
    const { massKg } = measureSpawnedMassKg(spawner, duration, 1 / 60);
    const impliedTph = kgPerSecondToTonnesPerHour(massKg / duration);
    expect(impliedTph).toBeGreaterThan(throughput * 0.99);
    expect(impliedTph).toBeLessThan(throughput * 1.01);
    // Sanity: mass should be near Q * duration in tonnes
    expect(massKg).toBeCloseTo(tonnesPerHourToKgPerSecond(throughput) * duration, 0);
  });

  it('matches wheat clump mass rate within 1%', () => {
    const throughput = 10;
    const spawner = makeSpawner({ throughput, cropType: 'wheatClump' });
    const duration = 30;
    const { massKg } = measureSpawnedMassKg(spawner, duration, 1 / 60);
    const impliedTph = kgPerSecondToTonnesPerHour(massKg / duration);
    expect(impliedTph).toBeGreaterThan(throughput * 0.99);
    expect(impliedTph).toBeLessThan(throughput * 1.01);
  });
});

describe('applyThrottleCap', () => {
  it('caps leftover credit including unspawned whole crops', () => {
    expect(applyThrottleCap(0.4, 5)).toBe(THROTTLED_ACCUMULATOR_CAP);
    expect(applyThrottleCap(0.2, 0)).toBeCloseTo(0.2, 10);
  });
});

describe('sampleEmitPosition', () => {
  it('stays within emitArea at yaw 0 when random is mid-face', () => {
    const spawner = makeSpawner();
    const p = sampleEmitPosition(spawner, () => 0.5);
    expect(p.x).toBeCloseTo(1, 10);
    expect(p.y).toBeCloseTo(2, 10);
    expect(p.z).toBeCloseTo(3, 10);
  });

  it('extends to emitArea half-width at random 0 / 1 extremes', () => {
    const spawner = makeSpawner({ emitArea: { x: 1, z: 0.5 } });
    // random() = 0 → local −0.5 * axis
    const p = sampleEmitPosition(spawner, () => 0);
    expect(p.x).toBeCloseTo(1 - 0.5, 10);
    expect(p.z).toBeCloseTo(3 - 0.25, 10);
  });
});

describe('sampleEmitVelocity', () => {
  it('is downward on average at mid random', () => {
    const v = sampleEmitVelocity(() => 0.5);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.y).toBeCloseTo(-0.5, 10);
    expect(v.z).toBeCloseTo(0, 10);
  });
});

describe('CROP_TYPES masses used by spawn rate', () => {
  it('exposes positive masses for every preset', () => {
    for (const preset of Object.values(CROP_TYPES)) {
      expect(preset.mass).toBeGreaterThan(0);
    }
  });
});
