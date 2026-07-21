import { describe, expect, it } from 'vitest';
import { CropPool } from './CropPool';

describe('CropPool', () => {
  it('acquires until exhausted then returns null', () => {
    const pool = new CropPool(2);
    expect(pool.acquire('potato', 0.25)).toBe(0);
    expect(pool.acquire('wheatClump', 0.03)).toBe(1);
    expect(pool.acquire('sugarBeet', 0.9)).toBeNull();
    expect(pool.isExhausted).toBe(true);
    expect(pool.activeCount).toBe(2);
  });

  it('reuses released slots (LIFO)', () => {
    const pool = new CropPool(2);
    const a = pool.acquire('potato', 0.25);
    const b = pool.acquire('potato', 0.25);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    pool.release(a!);
    expect(pool.activeCount).toBe(1);
    expect(pool.acquire('wheatClump', 0.03)).toBe(a);
    expect(pool.getSlot(a!).cropType).toBe('wheatClump');
  });

  it('releaseAll clears every active slot', () => {
    const pool = new CropPool(3);
    pool.acquire('potato', 0.25);
    pool.acquire('potato', 0.25);
    pool.releaseAll();
    expect(pool.activeCount).toBe(0);
    expect(pool.isExhausted).toBe(false);
    expect(pool.acquire('potato', 0.25)).not.toBeNull();
  });

  it('rejects non-positive capacity', () => {
    expect(() => new CropPool(0)).toThrow(RangeError);
    expect(() => new CropPool(1.5)).toThrow(RangeError);
  });
});
