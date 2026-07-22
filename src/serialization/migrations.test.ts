import { describe, expect, it } from 'vitest';
import { CROP_TYPES } from '../elements/cropTypes';
import { migrateLayout, migrateV1toV2 } from './migrations';

describe('migrateLayout', () => {
  it('migrates fileVersion 1 to 2', () => {
    const result = migrateLayout({ fileVersion: 1, keep: true, elements: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileVersion).toBe(2);
    expect(result.value.keep).toBe(true);
  });

  it('accepts current fileVersion 2 unchanged', () => {
    const result = migrateLayout({ fileVersion: 2, keep: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileVersion).toBe(2);
  });

  it('rejects non-integer fileVersion', () => {
    const result = migrateLayout({ fileVersion: 1.5 });
    expect(result.ok).toBe(false);
  });

  it('rejects future versions', () => {
    const result = migrateLayout({ fileVersion: 3 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.message).toMatch(/newer version/i);
  });
});

describe('migrateV1toV2', () => {
  it('fills spawner size defaults from crop type', () => {
    const migrated = migrateV1toV2({
      fileVersion: 1,
      elements: [
        {
          type: 'spawner',
          properties: {
            cropType: 'potato',
            throughput: 40,
            emitArea: { x: 0.6, z: 0.6 },
            enabled: true,
          },
        },
      ],
    });
    expect(migrated.fileVersion).toBe(2);
    const props = (migrated.elements as Array<{ properties: Record<string, number> }>)[0]!
      .properties;
    expect(props.diameterMinMm).toBe(20);
    expect(props.diameterMaxMm).toBe(150);
    expect(props.densityKgPerM3).toBeCloseTo(CROP_TYPES.potato.defaultDensityKgPerM3, 5);
  });
});
