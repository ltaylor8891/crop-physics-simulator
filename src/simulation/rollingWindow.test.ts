import { describe, expect, it } from 'vitest';
import { kgPerSecondToTonnesPerHour, tonnesPerHourToKgPerSecond } from '../utilities/flow';
import { RollingMassWindow } from './rollingWindow';

describe('RollingMassWindow', () => {
  it('returns 0 when empty', () => {
    const w = new RollingMassWindow(10);
    expect(w.rateKgPerSecond(5)).toBe(0);
  });

  it('matches constant rate during warm-up', () => {
    const w = new RollingMassWindow(10);
    const tph = 40;
    const kgPerS = tonnesPerHourToKgPerSecond(tph);
    const dt = 1 / 60;
    for (let t = dt; t <= 5; t += dt) {
      w.push(t, kgPerS * dt);
    }
    const rate = w.rateKgPerSecond(5);
    expect(kgPerSecondToTonnesPerHour(rate)).toBeGreaterThan(tph * 0.98);
    expect(kgPerSecondToTonnesPerHour(rate)).toBeLessThan(tph * 1.02);
  });

  it('matches constant rate after the window is full', () => {
    const w = new RollingMassWindow(10);
    const tph = 40;
    const kgPerS = tonnesPerHourToKgPerSecond(tph);
    const dt = 1 / 60;
    let now = dt;
    for (; now <= 30; now += dt) {
      w.push(now, kgPerS * dt);
    }
    const rate = w.rateKgPerSecond(now);
    const implied = kgPerSecondToTonnesPerHour(rate);
    expect(implied).toBeGreaterThan(tph - 2);
    expect(implied).toBeLessThan(tph + 2);
  });

  it('forgets mass older than the window', () => {
    const w = new RollingMassWindow(10);
    w.push(1, 100);
    w.push(12, 1);
    expect(w.massKgInWindow(12)).toBeCloseTo(1, 10);
  });

  it('clear empties the window', () => {
    const w = new RollingMassWindow(10);
    w.push(1, 5);
    w.clear();
    expect(w.rateKgPerSecond(2)).toBe(0);
  });
});
