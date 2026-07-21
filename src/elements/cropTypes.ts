import type { CropTypeId } from '../types/elements';

/**
 * Crop type presets (docs/PHYSICS_SPECIFICATION.md §Friction and Restitution).
 * Plausible defaults, not measured material properties. Presets live in code;
 * save files reference them by id.
 */
export interface CropTypePreset {
  id: CropTypeId;
  label: string;
  collider:
    { shape: 'ball'; radius: number } | { shape: 'capsule'; halfHeight: number; radius: number };
  /** kg per body */
  mass: number;
  friction: number;
  restitution: number;
  /** display colour for the instanced mesh */
  color: string;
}

export const CROP_TYPES: Record<CropTypeId, CropTypePreset> = {
  wheatClump: {
    id: 'wheatClump',
    label: 'Wheat (clump)',
    collider: { shape: 'ball', radius: 0.06 },
    mass: 0.03,
    friction: 0.5,
    restitution: 0.15,
    color: '#d9b45b',
  },
  potato: {
    id: 'potato',
    label: 'Potato',
    collider: { shape: 'capsule', halfHeight: 0.03, radius: 0.05 },
    mass: 0.25,
    friction: 0.6,
    restitution: 0.25,
    color: '#b58a5a',
  },
  sugarBeet: {
    id: 'sugarBeet',
    label: 'Sugar beet',
    collider: { shape: 'ball', radius: 0.09 },
    mass: 0.9,
    friction: 0.7,
    restitution: 0.2,
    color: '#c9c2a6',
  },
};
