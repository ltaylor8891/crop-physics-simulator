/**
 * Rolling mass-throughput window (docs/ROADMAP.md §Stage 13).
 * Pure — advances on the fixed physics step clock, never render frames.
 */

export const DEFAULT_THROUGHPUT_WINDOW_SECONDS = 10;

export interface MassSample {
  /** Simulation time (s) when the mass was credited. */
  time: number;
  /** Mass delta (kg). */
  massKg: number;
}

/**
 * Sliding window of mass samples → kg/s (then convert to t/h at the UI edge).
 */
export class RollingMassWindow {
  private samples: MassSample[] = [];
  readonly windowSeconds: number;

  constructor(windowSeconds: number = DEFAULT_THROUGHPUT_WINDOW_SECONDS) {
    if (!(windowSeconds > 0)) {
      throw new RangeError(`windowSeconds must be > 0, got ${windowSeconds}`);
    }
    this.windowSeconds = windowSeconds;
  }

  clear(): void {
    this.samples.length = 0;
  }

  /** Record a mass credit at simulation time `time`. */
  push(time: number, massKg: number): void {
    if (massKg <= 0 || !Number.isFinite(massKg)) return;
    this.samples.push({ time, massKg });
    this.prune(time);
  }

  prune(now: number): void {
    const cutoff = now - this.windowSeconds;
    while (this.samples.length > 0 && this.samples[0]!.time < cutoff) {
      this.samples.shift();
    }
  }

  /** Total mass (kg) currently inside the window. */
  massKgInWindow(now: number): number {
    this.prune(now);
    let sum = 0;
    for (const s of this.samples) sum += s.massKg;
    return sum;
  }

  /**
   * Average mass rate (kg/s).
   * Divides mass in the pruned window by `min(window, now)` so warm-up ramps
   * correctly and steady-state uses the full window length.
   * `now` is simulation time since last reset (epoch 0).
   */
  rateKgPerSecond(now: number): number {
    this.prune(now);
    let mass = 0;
    for (const s of this.samples) mass += s.massKg;
    if (mass <= 0) return 0;
    const duration = Math.min(this.windowSeconds, Math.max(now, 1 / 60));
    return mass / duration;
  }
}
