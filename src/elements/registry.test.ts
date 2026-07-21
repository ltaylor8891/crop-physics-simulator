import { describe, expect, it } from 'vitest';
import { ELEMENT_ID_PATTERN } from '../utilities/ids';
import type { ElementId, SceneElement } from '../types/elements';
import { createElement, ELEMENT_TYPES, getElementBounds } from './registry';

describe('createElement', () => {
  it('creates every element type with a valid id, yaw 0, and defaults', () => {
    for (const type of ELEMENT_TYPES) {
      const element = createElement(type, { x: 3, z: -2 }, {});
      expect(element.type).toBe(type);
      expect(element.id).toMatch(ELEMENT_ID_PATTERN);
      expect(element.rotationYaw).toBe(0);
      expect(element.position.x).toBe(3);
      expect(element.position.z).toBe(-2);
    }
  });

  it('places ground elements at y 0 and spawners above belt height', () => {
    expect(createElement('conveyor', { x: 0, z: 0 }, {}).position.y).toBe(0);
    expect(createElement('spawner', { x: 0, z: 0 }, {}).position.y).toBe(2);
  });

  it('numbers default names per type, skipping past the highest existing number', () => {
    const elements: Record<ElementId, SceneElement> = {};
    const first = createElement('conveyor', { x: 0, z: 0 }, elements);
    elements[first.id] = first;
    const second = createElement('conveyor', { x: 1, z: 0 }, elements);
    elements[second.id] = second;
    const otherType = createElement('elevator', { x: 2, z: 0 }, elements);

    expect(first.name).toBe('Belt conveyor 1');
    expect(second.name).toBe('Belt conveyor 2');
    expect(otherType.name).toBe('Bucket elevator 1');
  });

  it('conveyor defaults match the documented ranges', () => {
    const conveyor = createElement('conveyor', { x: 0, z: 0 }, {});
    if (conveyor.type !== 'conveyor') throw new Error('wrong type');
    expect(conveyor.properties).toEqual({
      length: 6,
      width: 0.8,
      beltHeight: 0.75,
      inclineDeg: 0,
      beltSpeed: 90,
      skirts: true,
    });
  });
});

describe('getElementBounds', () => {
  it('sizes conveyor bounds from length, belt height, and width', () => {
    const conveyor = createElement('conveyor', { x: 0, z: 0 }, {});
    const bounds = getElementBounds(conveyor);
    expect(bounds.size).toEqual({ x: 6, y: 0.75, z: 0.8 });
    expect(bounds.center.y).toBeCloseTo(0.375, 10);
  });

  it('centres zone bounds at half their height', () => {
    const zone = createElement('collectionZone', { x: 0, z: 0 }, {});
    const bounds = getElementBounds(zone);
    expect(bounds.size).toEqual({ x: 2, y: 2, z: 2 });
    expect(bounds.center).toEqual({ x: 0, y: 1, z: 0 });
  });
});
