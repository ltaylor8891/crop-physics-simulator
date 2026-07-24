/**
 * Pure grading-screen maths (docs/DEVELOP_PROGRAM.md Phase C, ADR-020).
 * No React/Rapier imports so it stays unit-testable; `cropRuntime.tickGradingScreens`
 * injects these into the fixed step, mirroring how `zoneVolume.isPointInsideZone`
 * is injected into the despawn tick.
 *
 * Two concerns:
 *  - `gradingDeckContact` — is a crop resting on the deck, where along it, and the
 *    deck-surface height at that point (used to drop a fall-through crop just below).
 *  - `gradeFallProbability` — the per-step chance an undersized crop drops through,
 *    weighted toward the infeed by `frontBias`.
 */

import { degreesToRadians } from '../utilities/units';

export interface GradeScreenSpec {
  position: { x: number; y: number; z: number };
  rotationYaw: number;
  length: number;
  width: number;
  beltHeight: number;
  inclineDeg: number;
  apertureMm: number;
  frontBias: number;
}

export interface GradeDeckContact {
  /** True when the crop centre rests on (just above) the deck surface, within its bounds. */
  onDeck: boolean;
  /** Normalised position along the deck from infeed (0) to discharge (1). */
  alongFraction: number;
  /** World Y of the deck top surface beneath the crop (drop target reference). */
  surfaceY: number;
}

/** Vertical band above the deck surface counted as "resting on the deck" (m). */
const DECK_BAND_M = 0.3;
const LATERAL_MARGIN_M = 0.1;
const ALONG_MARGIN_M = 0.1;

/**
 * Where a world point sits relative to a grading deck. Inverts the element yaw, then
 * measures along-belt distance and height above the (possibly inclined) deck surface,
 * mirroring the belt-slab convention (infeed at −length/2, pivot there).
 */
export function gradingDeckContact(
  point: { x: number; y: number; z: number },
  screen: GradeScreenSpec,
): GradeDeckContact {
  // Inverse yaw about the element origin: local = rotateYaw(world − origin, −yaw).
  const dx = point.x - screen.position.x;
  const dz = point.z - screen.position.z;
  const cy = Math.cos(screen.rotationYaw);
  const sy = Math.sin(screen.rotationYaw);
  const localX = dx * cy - dz * sy;
  const localZ = dx * sy + dz * cy;
  const localY = point.y - screen.position.y;

  const incline = degreesToRadians(screen.inclineDeg);
  const c = Math.cos(incline);
  const s = Math.sin(incline);
  // Infeed point (element-local) is (−length/2, beltHeight, 0); deck dir (c,s,0), normal (−s,c,0).
  const vx = localX - -screen.length / 2;
  const vy = localY - screen.beltHeight;
  const d = vx * c + vy * s; // along-belt distance from the infeed end
  const h = vx * -s + vy * c; // height above the deck surface

  const onDeck =
    d >= -ALONG_MARGIN_M &&
    d <= screen.length + ALONG_MARGIN_M &&
    Math.abs(localZ) <= screen.width / 2 + LATERAL_MARGIN_M &&
    h >= -0.05 &&
    h <= DECK_BAND_M;

  const alongFraction = Math.min(1, Math.max(0, d / screen.length));
  const surfaceY = screen.position.y + screen.beltHeight + d * s;
  return { onDeck, alongFraction, surfaceY };
}

/** Base per-second fall-through rate for an undersized crop at even (bias 0) weighting. */
export const GRADE_BASE_RATE_PER_S = 4;

/**
 * Position weighting for the fall-through rate. `frontBias` −100…100 tilts the rate
 * linearly along the deck: +100 → twice the rate at the infeed, zero at the discharge;
 * 0 → even; −100 → the reverse. Never negative.
 */
export function gradeFallWeight(alongFraction: number, frontBias: number): number {
  const b = Math.max(-100, Math.min(100, frontBias)) / 100;
  const f = Math.max(0, Math.min(1, alongFraction));
  return Math.max(0, 1 + b * (1 - 2 * f));
}

/** Probability an undersized crop drops through this step: 1 − e^(−rate·dt). */
export function gradeFallProbability(
  alongFraction: number,
  frontBias: number,
  dtSeconds: number,
): number {
  const rate = GRADE_BASE_RATE_PER_S * gradeFallWeight(alongFraction, frontBias);
  return 1 - Math.exp(-rate * Math.max(0, dtSeconds));
}
