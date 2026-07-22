/**
 * Per-crop size sampling and mass-from-density (spawner size distributions).
 * Pure — no React/Rapier.
 *
 * Length percent: total tuber length L = (lengthPct/100) × D.
 * Capsule: halfHeight = max(0, (L − D) / 2) — sphere when L ≤ D (pct ≤ 100).
 * Ball crop types use diameter only.
 */

import {
  capsuleVolumeM3,
  CROP_TYPES,
  sphereVolumeM3,
  type CropTypePreset,
} from '../elements/cropTypes';
import type { CropTypeId, SpawnerProperties } from '../types/elements';

export interface CropGeometry {
  shape: 'ball' | 'capsule';
  /** m */
  radius: number;
  /** m — 0 for balls / spheres */
  halfHeight: number;
  /** m³ */
  volumeM3: number;
  /** kg */
  massKg: number;
}

/** Uniform sample in [0, 1). Injected for deterministic tests. */
export type RandomFn = () => number;

/**
 * Map bipolar bias (−100…+100) to a power exponent for `u^k`.
 * 0 → uniform (k=1); negative favours low end; positive favours high end.
 */
export function biasExponent(bias: number): number {
  const b = Math.max(-100, Math.min(100, bias));
  if (b === 0) return 1;
  // |b|=100 → k=4 or 1/4
  const t = Math.abs(b) / 100;
  const k = 1 + 3 * t;
  return b < 0 ? k : 1 / k;
}

/**
 * Sample in [min, max] with bipolar bias. Guarantees min≤max; swaps if needed.
 */
export function sampleBiasedRange(
  min: number,
  max: number,
  bias: number,
  random: RandomFn = Math.random,
): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (hi <= lo) return lo;
  const u = Math.min(1, Math.max(0, random()));
  const t = u ** biasExponent(bias);
  return lo + (hi - lo) * t;
}

export function mmToMetres(mm: number): number {
  return mm / 1000;
}

/**
 * Clamp spawner diameter range into the crop type’s fixed limits.
 * Ensures min ≤ max after clamp.
 */
export function clampDiameterRangeMm(
  cropType: CropTypeId,
  diameterMinMm: number,
  diameterMaxMm: number,
): { diameterMinMm: number; diameterMaxMm: number } {
  const { diameterMinMm: limMin, diameterMaxMm: limMax } = CROP_TYPES[cropType].sizeLimits;
  let min = Math.max(limMin, Math.min(limMax, diameterMinMm));
  let max = Math.max(limMin, Math.min(limMax, diameterMaxMm));
  if (min > max) [min, max] = [max, min];
  return { diameterMinMm: min, diameterMaxMm: max };
}

export function clampLengthPct(minPct: number, maxPct: number): {
  lengthMinPct: number;
  lengthMaxPct: number;
} {
  let min = Math.max(0, Math.min(100, minPct));
  let max = Math.max(0, Math.min(100, maxPct));
  if (min > max) [min, max] = [max, min];
  return { lengthMinPct: min, lengthMaxPct: max };
}

/**
 * Build geometry + mass for sampled diameter (m) and length percent.
 */
export function geometryFromSize(
  preset: CropTypePreset,
  diameterM: number,
  lengthPct: number,
  densityKgPerM3: number,
): CropGeometry {
  const radius = Math.max(1e-4, diameterM / 2);
  const density = Math.max(0, densityKgPerM3);

  if (preset.collider.shape === 'ball') {
    const volumeM3 = sphereVolumeM3(radius);
    return {
      shape: 'ball',
      radius,
      halfHeight: 0,
      volumeM3,
      massKg: Math.max(1e-6, density * volumeM3),
    };
  }

  const pct = Math.max(0, Math.min(100, lengthPct));
  const lengthM = (pct / 100) * diameterM;
  const halfHeight = Math.max(0, (lengthM - diameterM) / 2);
  const volumeM3 = capsuleVolumeM3(radius, halfHeight);
  return {
    shape: 'capsule',
    radius,
    halfHeight,
    volumeM3,
    massKg: Math.max(1e-6, density * volumeM3),
  };
}

/** Sample one crop’s geometry from spawner size properties. */
export function sampleCropGeometry(
  cropType: CropTypeId,
  props: Pick<
    SpawnerProperties,
    | 'diameterMinMm'
    | 'diameterMaxMm'
    | 'diameterBias'
    | 'lengthMinPct'
    | 'lengthMaxPct'
    | 'lengthBias'
    | 'densityKgPerM3'
  >,
  random: RandomFn = Math.random,
): CropGeometry {
  const preset = CROP_TYPES[cropType];
  const diam = clampDiameterRangeMm(cropType, props.diameterMinMm, props.diameterMaxMm);
  const len = clampLengthPct(props.lengthMinPct, props.lengthMaxPct);

  const diameterMm = sampleBiasedRange(
    diam.diameterMinMm,
    diam.diameterMaxMm,
    props.diameterBias,
    random,
  );
  const lengthPct = sampleBiasedRange(
    len.lengthMinPct,
    len.lengthMaxPct,
    props.lengthBias,
    random,
  );

  return geometryFromSize(preset, mmToMetres(diameterMm), lengthPct, props.densityKgPerM3);
}

/**
 * Deterministic mid-size geometry for elevator discharge (plan: type default).
 * Mid diameter of limits; length 100% → L = D → sphere for capsules.
 */
export function defaultCropGeometry(cropType: CropTypeId): CropGeometry {
  const preset = CROP_TYPES[cropType];
  const { diameterMinMm, diameterMaxMm } = preset.sizeLimits;
  const diameterMm = (diameterMinMm + diameterMaxMm) / 2;
  return geometryFromSize(preset, mmToMetres(diameterMm), 100, preset.defaultDensityKgPerM3);
}

/** Contact extent (m) for floor tests — radius or capsule tip. */
export function contactExtentM(geometry: CropGeometry): number {
  if (geometry.shape === 'ball') return geometry.radius;
  return geometry.halfHeight + geometry.radius;
}
