/**
 * Material-flow and unit conversions (docs/DOMAIN_MODEL.md §Material-Flow Terminology).
 * All throughput/speed conversions in the app must go through these helpers.
 */

/** Tonnes per hour → kilograms per second. 1 t/h = 1000 kg / 3600 s. */
export function tonnesPerHourToKgPerSecond(tonnesPerHour: number): number {
  return (tonnesPerHour * 1000) / 3600;
}

/** Kilograms per second → tonnes per hour. */
export function kgPerSecondToTonnesPerHour(kgPerSecond: number): number {
  return (kgPerSecond * 3600) / 1000;
}

/**
 * Mass throughput → discrete crop spawn rate.
 * @param tonnesPerHour target mass flow
 * @param cropMassKg mass of one crop body (must be > 0)
 */
export function cropsPerSecond(tonnesPerHour: number, cropMassKg: number): number {
  if (cropMassKg <= 0) {
    throw new RangeError(`cropMassKg must be > 0, got ${cropMassKg}`);
  }
  return tonnesPerHourToKgPerSecond(tonnesPerHour) / cropMassKg;
}

/** Belt speed in metres per minute → metres per second (physics unit). */
export function metresPerMinuteToMetresPerSecond(metresPerMinute: number): number {
  return metresPerMinute / 60;
}

/**
 * Fractional spawn accumulator (docs/TECHNICAL_DESIGN.md §Crop Spawning Calculation).
 * Advance by one fixed timestep; returns how many whole crops to spawn now while
 * carrying the fractional remainder so the long-run average rate is exact.
 */
export function advanceSpawnAccumulator(
  accumulator: number,
  cropsPerSecondRate: number,
  dtSeconds: number,
): { spawnCount: number; accumulator: number } {
  const next = accumulator + cropsPerSecondRate * dtSeconds;
  const spawnCount = Math.floor(next);
  return { spawnCount, accumulator: next - spawnCount };
}
