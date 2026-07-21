import { describe, expect, it } from 'vitest';
import { migrateLayout } from './migrations';

describe('migrateLayout', () => {
  it('accepts current fileVersion 1 unchanged', () => {
    const result = migrateLayout({ fileVersion: 1, keep: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileVersion).toBe(1);
    expect(result.value.keep).toBe(true);
  });

  it('rejects non-integer fileVersion', () => {
    const result = migrateLayout({ fileVersion: 1.5 });
    expect(result.ok).toBe(false);
  });

  it('rejects future versions', () => {
    const result = migrateLayout({ fileVersion: 2 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.message).toMatch(/newer version/i);
  });
});
