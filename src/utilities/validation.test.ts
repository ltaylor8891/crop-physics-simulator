import { describe, expect, it } from 'vitest';
import { clampNumber, parseConstrainedNumber, parseSceneName } from './validation';

describe('parseConstrainedNumber', () => {
  const beltSpeed = { min: 0, max: 300, rangeLabel: '0 – 300 m/min' };

  it('accepts values inside the range', () => {
    expect(parseConstrainedNumber('90', beltSpeed)).toEqual({ ok: true, value: 90 });
    expect(parseConstrainedNumber('0', beltSpeed)).toEqual({ ok: true, value: 0 });
    expect(parseConstrainedNumber('300', beltSpeed)).toEqual({ ok: true, value: 300 });
  });

  it('rejects empty, non-numeric, and out-of-range drafts', () => {
    expect(parseConstrainedNumber('', beltSpeed)).toEqual({
      ok: false,
      error: '0 – 300 m/min',
    });
    expect(parseConstrainedNumber('nope', beltSpeed)).toEqual({
      ok: false,
      error: '0 – 300 m/min',
    });
    expect(parseConstrainedNumber('301', beltSpeed)).toEqual({
      ok: false,
      error: '0 – 300 m/min',
    });
    expect(parseConstrainedNumber('-1', beltSpeed)).toEqual({
      ok: false,
      error: '0 – 300 m/min',
    });
  });
});

describe('clampNumber', () => {
  it('clamps to the inclusive bounds', () => {
    expect(clampNumber(50, 0, 100)).toBe(50);
    expect(clampNumber(-5, 0, 100)).toBe(0);
    expect(clampNumber(150, 0, 100)).toBe(100);
  });
});

describe('parseSceneName', () => {
  it('accepts 1–64 character names', () => {
    expect(parseSceneName('Intake', 'Untitled')).toEqual({ value: 'Intake', error: null });
  });

  it('reverts empty or oversized names', () => {
    expect(parseSceneName('   ', 'Untitled')).toEqual({
      value: 'Untitled',
      error: '1 – 64 characters',
    });
    expect(parseSceneName('x'.repeat(65), 'Untitled')).toEqual({
      value: 'Untitled',
      error: '1 – 64 characters',
    });
  });
});
