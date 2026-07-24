import { describe, expect, it } from 'vitest';
import { CROP_TYPES } from '../elements/cropTypes';
import {
  migrateLayout,
  migrateV1toV2,
  migrateV2toV3,
  migrateV3toV4,
  migrateV4toV5,
} from './migrations';

describe('migrateLayout', () => {
  it('migrates fileVersion 1 through to current', () => {
    const result = migrateLayout({ fileVersion: 1, keep: true, elements: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileVersion).toBe(5);
    expect(result.value.keep).toBe(true);
  });

  it('migrates fileVersion 2 to current', () => {
    const result = migrateLayout({ fileVersion: 2, keep: true, elements: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileVersion).toBe(5);
  });

  it('accepts current fileVersion 5 unchanged', () => {
    const result = migrateLayout({ fileVersion: 5, keep: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileVersion).toBe(5);
  });

  it('rejects non-integer fileVersion', () => {
    const result = migrateLayout({ fileVersion: 1.5 });
    expect(result.ok).toBe(false);
  });

  it('rejects future versions', () => {
    const result = migrateLayout({ fileVersion: 6 });
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

describe('migrateV2toV3', () => {
  it('strips elevator elements', () => {
    const migrated = migrateV2toV3({
      fileVersion: 2,
      elements: [
        { type: 'conveyor', id: 'c1' },
        { type: 'elevator', id: 'e1' },
        { type: 'spawner', id: 's1' },
      ],
    });
    expect(migrated.fileVersion).toBe(3);
    expect(migrated.elements).toEqual([
      { type: 'conveyor', id: 'c1' },
      { type: 'spawner', id: 's1' },
    ]);
  });
});

describe('migrateV3toV4', () => {
  it('back-fills showLegs and diverter defaults on conveyors', () => {
    const migrated = migrateV3toV4({
      fileVersion: 3,
      elements: [
        {
          type: 'conveyor',
          id: 'c1',
          properties: {
            length: 6,
            width: 0.8,
            beltHeight: 0.75,
            inclineDeg: 0,
            beltSpeed: 90,
            skirts: true,
          },
        },
        { type: 'spawner', id: 's1', properties: { throughput: 40 } },
      ],
    });
    expect(migrated.fileVersion).toBe(4);
    const els = migrated.elements as Array<{ type: string; properties: Record<string, unknown> }>;
    expect(els[0]!.properties.showLegs).toBe(true);
    expect(els[0]!.properties.diverter).toEqual({ offsetAlongBelt: 0, length: 0, angleDeg: 0 });
    // Non-conveyor elements are untouched.
    expect(els[1]!.properties).toEqual({ throughput: 40 });
  });

  it('does not overwrite conveyor fields already present', () => {
    const migrated = migrateV3toV4({
      fileVersion: 3,
      elements: [
        {
          type: 'conveyor',
          id: 'c1',
          properties: {
            showLegs: false,
            diverter: { offsetAlongBelt: 2, length: 1, angleDeg: 20 },
          },
        },
      ],
    });
    const props = (migrated.elements as Array<{ properties: Record<string, unknown> }>)[0]!
      .properties;
    expect(props.showLegs).toBe(false);
    expect(props.diverter).toEqual({ offsetAlongBelt: 2, length: 1, angleDeg: 20 });
  });
});

describe('migrateV4toV5', () => {
  it('back-fills lateralOffset on the conveyor diverter', () => {
    const migrated = migrateV4toV5({
      fileVersion: 4,
      elements: [
        {
          type: 'conveyor',
          id: 'c1',
          properties: {
            showLegs: true,
            diverter: { offsetAlongBelt: 3, length: 1.5, angleDeg: 35 },
          },
        },
        { type: 'spawner', id: 's1', properties: { throughput: 40 } },
      ],
    });
    expect(migrated.fileVersion).toBe(5);
    const els = migrated.elements as Array<{ properties: Record<string, unknown> }>;
    expect(els[0]!.properties.diverter).toEqual({
      offsetAlongBelt: 3,
      lateralOffset: 0,
      length: 1.5,
      angleDeg: 35,
    });
    expect(els[1]!.properties).toEqual({ throughput: 40 });
  });

  it('does not overwrite a lateralOffset already present', () => {
    const migrated = migrateV4toV5({
      fileVersion: 4,
      elements: [
        {
          type: 'conveyor',
          id: 'c1',
          properties: {
            diverter: { offsetAlongBelt: 0, lateralOffset: 0.5, length: 2, angleDeg: 0 },
          },
        },
      ],
    });
    const props = (migrated.elements as Array<{ properties: Record<string, unknown> }>)[0]!
      .properties;
    expect((props.diverter as Record<string, unknown>).lateralOffset).toBe(0.5);
  });
});
