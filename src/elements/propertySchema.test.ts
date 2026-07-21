import { describe, expect, it } from 'vitest';
import { getPropertyPath, setPropertyPath } from './propertySchema';

describe('getPropertyPath / setPropertyPath', () => {
  it('reads and writes top-level keys', () => {
    const props = { length: 6, skirts: true };
    expect(getPropertyPath(props, 'length')).toBe(6);
    expect(setPropertyPath(props, 'length', 8)).toEqual({ length: 8, skirts: true });
    expect(props.length).toBe(6); // original untouched
  });

  it('clones nested objects when writing a deep path', () => {
    const props = { footprint: { x: 1.2, z: 1.2 }, height: 8 };
    const next = setPropertyPath(props, 'footprint.x', 2);
    expect(next).toEqual({ footprint: { x: 2, z: 1.2 }, height: 8 });
    expect(props.footprint.x).toBe(1.2);
    expect(getPropertyPath(next, 'footprint.x')).toBe(2);
  });
});
