import { describe, expect, it } from 'vitest';
import { CROP_TYPES, defaultSpawnerSizeProperties } from '../elements/cropTypes';
import type { SpawnerElement } from '../types/elements';
import { kgPerSecondToTonnesPerHour, tonnesPerHourToKgPerSecond } from '../utilities/flow';
import { sampleCropGeometry } from './cropSize';
import {
  applyThrottleCap,
  applyThrottleCreditCap,
  createSpawnerRuntimeState,
  measureSpawnedMassKg,
  sampleEmitPosition,
  sampleEmitVelocity,
  tickSpawner,
  THROTTLED_ACCUMULATOR_CAP,
  THROTTLED_CREDIT_KG_CAP,
} from './spawning';

function makeSpawner(overrides?: Partial<SpawnerElement['properties']>): SpawnerElement {
  const cropType = overrides?.cropType ?? 'potato';
  return {
    id: 'spawner-1',
    type: 'spawner',
    name: 'Spawner 1',
    position: { x: 1, y: 2, z: 3 },
    rotationYaw: 0,
    properties: {
      cropType,
      throughput: 40,
      emitArea: { x: 0.6, z: 0.6 },
      enabled: true,
      ...defaultSpawnerSizeProperties(cropType),
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

  it('accumulates mass credit across steps before first emit', () => {
    const spawner = makeSpawner({ throughput: 36, cropType: 'potato' });
    const mass = sampleCropGeometry('potato', spawner.properties, () => 0.5).massKg;
    let state = createSpawnerRuntimeState();
    const kgPerStep = tonnesPerHourToKgPerSecond(36) / 60;
    // First steps should not emit until credit covers one crop.
    let tick = tickSpawner(state, spawner, 1 / 60, () => 0.5);
    expect(tick.requested).toBe(0);
    state = { creditKg: tick.creditKg };
    expect(state.creditKg).toBeCloseTo(kgPerStep, 8);

    const stepsNeeded = Math.ceil(mass / kgPerStep);
    for (let i = 1; i < stepsNeeded; i++) {
      tick = tickSpawner(state, spawner, 1 / 60, () => 0.5);
      state = { creditKg: tick.creditKg };
    }
    expect(tick.requested).toBeGreaterThanOrEqual(1);
    expect(tick.poses[0]?.massKg).toBeCloseTo(mass, 8);
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

describe('applyThrottleCreditCap', () => {
  it('caps leftover mass credit', () => {
    expect(applyThrottleCreditCap(0.4, 5)).toBe(THROTTLED_CREDIT_KG_CAP);
    expect(applyThrottleCreditCap(0.2, 0)).toBeCloseTo(0.2, 10);
  });
});

describe('applyThrottleCap', () => {
  it('caps leftover crop-count credit for elevators', () => {
    expect(applyThrottleCap(0.4, 5)).toBe(THROTTLED_ACCUMULATOR_CAP);
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

describe('CROP_TYPES densities', () => {
  it('exposes positive default densities for every preset', () => {
    for (const preset of Object.values(CROP_TYPES)) {
      expect(preset.defaultDensityKgPerM3).toBeGreaterThan(0);
      expect(preset.mass).toBeGreaterThan(0);
    }
  });
});
