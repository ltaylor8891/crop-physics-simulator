import { describe, expect, it } from 'vitest';
import { ELEMENT_ID_PATTERN, generateElementId } from './ids';

describe('generateElementId', () => {
  it('produces ids matching the documented format', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateElementId()).toMatch(ELEMENT_ID_PATTERN);
    }
  });

  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, generateElementId));
    expect(ids.size).toBe(1000);
  });
});
