import type { CropTypeId } from '../types/elements';

/**
 * Crop type presets (docs/PHYSICS_SPECIFICATION.md §Friction and Restitution).
 * Plausible defaults, not measured material properties. Presets live in code;
 * save files reference them by id.
 */
export interface CropSizeLimits {
  /** mm — fixed preset limits for spawner diameter range */
  diameterMinMm: number;
  diameterMaxMm: number;
}

export interface CropTypePreset {
  id: CropTypeId;
  label: string;
  collider:
    { shape: 'ball'; radius: number } | { shape: 'capsule'; halfHeight: number; radius: number };
  /**
   * Default density (kg/m³) so a mid-range sphere of the type’s diameter
   * limits has mass close to the legacy preset mass.
   */
  defaultDensityKgPerM3: number;
  /** Legacy reference mass (kg) — documentation / tests; runtime mass is ρV. */
  mass: number;
  friction: number;
  restitution: number;
  /** display colour for the instanced mesh */
  color: string;
  sizeLimits: CropSizeLimits;
}

/** Sphere volume (m³). */
export function sphereVolumeM3(radiusM: number): number {
  return (4 / 3) * Math.PI * radiusM * radiusM * radiusM;
}

/**
 * Capsule volume (m³): two hemispheres + cylinder.
 * `halfHeight` is the half-length of the cylindrical section (Rapier convention).
 */
export function capsuleVolumeM3(radiusM: number, halfHeightM: number): number {
  const hh = Math.max(0, halfHeightM);
  return sphereVolumeM3(radiusM) + Math.PI * radiusM * radiusM * (2 * hh);
}

function densityForSphereMass(radiusM: number, massKg: number): number {
  const v = sphereVolumeM3(radiusM);
  return v > 0 ? massKg / v : 0;
}

export const CROP_TYPES: Record<CropTypeId, CropTypePreset> = {
  wheatClump: {
    id: 'wheatClump',
    label: 'Wheat (clump)',
    collider: { shape: 'ball', radius: 0.06 },
    mass: 0.03,
    // Mid diameter 80 mm → r=0.04; density keeps ~legacy mass at that size.
    defaultDensityKgPerM3: densityForSphereMass(0.04, 0.03),
    friction: 0.5,
    restitution: 0.15,
    color: '#d9b45b',
    sizeLimits: { diameterMinMm: 40, diameterMaxMm: 120 },
  },
  potato: {
    id: 'potato',
    label: 'Potato',
    collider: { shape: 'capsule', halfHeight: 0.03, radius: 0.05 },
    mass: 0.25,
    // Mid diameter 85 mm sphere ≈ legacy 0.25 kg.
    defaultDensityKgPerM3: densityForSphereMass(0.0425, 0.25),
    friction: 0.6,
    restitution: 0.25,
    color: '#b58a5a',
    sizeLimits: { diameterMinMm: 20, diameterMaxMm: 150 },
  },
  sugarBeet: {
    id: 'sugarBeet',
    label: 'Sugar beet',
    collider: { shape: 'ball', radius: 0.09 },
    mass: 0.9,
    // Mid diameter 125 mm → r=0.0625.
    defaultDensityKgPerM3: densityForSphereMass(0.0625, 0.9),
    friction: 0.7,
    restitution: 0.2,
    color: '#c9c2a6',
    sizeLimits: { diameterMinMm: 50, diameterMaxMm: 200 },
  },
};

/** Default spawner size props for a crop type (full limit range, uniform bias). */
export function defaultSpawnerSizeProperties(cropType: CropTypeId): {
  diameterMinMm: number;
  diameterMaxMm: number;
  diameterBias: number;
  lengthMinPct: number;
  lengthMaxPct: number;
  lengthBias: number;
  densityKgPerM3: number;
} {
  const preset = CROP_TYPES[cropType];
  return {
    diameterMinMm: preset.sizeLimits.diameterMinMm,
    diameterMaxMm: preset.sizeLimits.diameterMaxMm,
    diameterBias: 0,
    lengthMinPct: 0,
    lengthMaxPct: 100,
    lengthBias: 0,
    densityKgPerM3: preset.defaultDensityKgPerM3,
  };
}
