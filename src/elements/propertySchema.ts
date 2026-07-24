import type { CropTypeId, ElementType } from '../types/elements';
import { CROP_TYPES } from './cropTypes';

/**
 * Property-editor field schema per element type
 * (docs/TECHNICAL_DESIGN.md §Extension Points; ranges from SAVE_FILE_FORMAT.md).
 */

export interface NumberFieldDef {
  kind: 'number';
  /** Dot path under `properties`, e.g. `length` or `footprint.x`. */
  path: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit: string;
}

export interface BooleanFieldDef {
  kind: 'boolean';
  path: string;
  label: string;
}

export interface EnumFieldDef {
  kind: 'enum';
  path: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export type PropertyFieldDef = NumberFieldDef | BooleanFieldDef | EnumFieldDef;

function numberField(
  path: string,
  label: string,
  min: number,
  max: number,
  unit: string,
  step?: number,
): NumberFieldDef {
  return { kind: 'number', path, label, min, max, unit, step };
}

const CROP_OPTIONS = (Object.keys(CROP_TYPES) as CropTypeId[]).map((id) => ({
  value: id,
  label: CROP_TYPES[id].label,
}));

export const PROPERTY_FIELDS: Record<ElementType, PropertyFieldDef[]> = {
  conveyor: [
    numberField('length', 'Length', 1, 50, 'm', 0.1),
    numberField('width', 'Width', 0.3, 3, 'm', 0.05),
    numberField('beltHeight', 'Belt height', 0.2, 5, 'm', 0.05),
    numberField('inclineDeg', 'Incline', -30, 30, '°', 1),
    numberField('beltSpeed', 'Belt speed', 0, 300, 'm/min', 1),
    { kind: 'boolean', path: 'skirts', label: 'Side skirts' },
    { kind: 'boolean', path: 'showLegs', label: 'Support legs' },
    numberField('diverter.offsetAlongBelt', 'Diverter position', 0, 50, 'm', 0.1),
    numberField('diverter.lateralOffset', 'Diverter offset', -1.5, 1.5, 'm', 0.05),
    numberField('diverter.length', 'Diverter length', 0, 20, 'm', 0.1),
    numberField('diverter.angleDeg', 'Diverter angle', -80, 80, '°', 1),
  ],
  elevator: [
    numberField('height', 'Height', 1, 30, 'm', 0.1),
    numberField('footprint.x', 'Footprint X', 0.5, 4, 'm', 0.1),
    numberField('footprint.z', 'Footprint Z', 0.5, 4, 'm', 0.1),
    numberField('transportSpeed', 'Transport speed', 0.5, 5, 'm/s', 0.1),
    numberField('dischargeRateCap', 'Discharge rate cap', 0.1, 500, 't/h', 0.1),
    numberField('dischargeVelocity', 'Discharge velocity', 0, 5, 'm/s', 0.1),
  ],
  spawner: [
    { kind: 'enum', path: 'cropType', label: 'Crop type', options: CROP_OPTIONS },
    numberField('throughput', 'Throughput', 0.1, 500, 't/h', 0.1),
    numberField('emitArea.x', 'Emit area X', 0.1, 3, 'm', 0.05),
    numberField('emitArea.z', 'Emit area Z', 0.1, 3, 'm', 0.05),
    // Diameter UI range spans all crop types; spawn clamps to the active type’s limits.
    numberField('diameterMinMm', 'Diameter min', 20, 200, 'mm', 1),
    numberField('diameterMaxMm', 'Diameter max', 20, 200, 'mm', 1),
    numberField('diameterBias', 'Diameter bias', -100, 100, '', 1),
    numberField('lengthMinPct', 'Length min', 0, 100, '% of diam', 1),
    numberField('lengthMaxPct', 'Length max', 0, 100, '% of diam', 1),
    numberField('lengthBias', 'Length bias', -100, 100, '', 1),
    numberField('densityKgPerM3', 'Density', 50, 2000, 'kg/m³', 1),
    { kind: 'boolean', path: 'enabled', label: 'Enabled' },
  ],
  collectionZone: [
    numberField('size.x', 'Size X', 0.5, 20, 'm', 0.1),
    numberField('size.y', 'Size Y', 0.5, 20, 'm', 0.1),
    numberField('size.z', 'Size Z', 0.5, 20, 'm', 0.1),
  ],
  despawnZone: [
    numberField('size.x', 'Size X', 0.5, 20, 'm', 0.1),
    numberField('size.y', 'Size Y', 0.5, 20, 'm', 0.1),
    numberField('size.z', 'Size Z', 0.5, 20, 'm', 0.1),
  ],
  chute: [
    numberField('length', 'Length', 0.1, 1, 'm', 0.05),
    numberField('width', 'Width', 0.3, 3, 'm', 0.05),
    numberField('angleDeg', 'Slope', 5, 60, '°', 1),
    numberField('topHeight', 'Top height', 0.2, 5, 'm', 0.05),
  ],
  hopper: [
    numberField('footprint.x', 'Footprint X', 0.5, 6, 'm', 0.1),
    numberField('footprint.z', 'Footprint Z', 0.5, 6, 'm', 0.1),
    numberField('height', 'Wall height', 0.3, 3, 'm', 0.05),
    numberField('wallThickness', 'Wall thickness', 0.02, 0.2, 'm', 0.01),
    numberField('mountHeight', 'Mount height', 0, 5, 'm', 0.05),
    numberField('angleDeg', 'Tilt angle', -30, 30, '°', 1),
    { kind: 'boolean', path: 'backstopOnly', label: 'Backstop only (open infeed)' },
  ],
  gradingScreen: [
    numberField('length', 'Length', 1, 50, 'm', 0.1),
    numberField('width', 'Width', 0.3, 3, 'm', 0.05),
    numberField('beltHeight', 'Deck height', 0.2, 5, 'm', 0.05),
    numberField('inclineDeg', 'Incline', -30, 30, '°', 1),
    numberField('beltSpeed', 'Belt speed', 0, 300, 'm/min', 1),
    numberField('apertureMm', 'Aperture', 1, 200, 'mm', 1),
    numberField('frontBias', 'Front bias', -100, 100, '', 1),
    { kind: 'boolean', path: 'skirts', label: 'Side skirts' },
  ],
};

/** Build area half-extent for editable position fields (docs/UI_UX_SPECIFICATION.md). */
export const POSITION_RANGE = { min: -50, max: 50 } as const;
export const ROTATION_DEG_RANGE = { min: -180, max: 180 } as const;
export const NAME_MAX_LENGTH = 64;

/** Read a (possibly nested) property value by dot path. */
export function getPropertyPath(properties: object, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = properties;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Return a shallow-cloned properties object with `path` set to `value`.
 * Nested objects along the path are cloned so the store stays immutable.
 */
export function setPropertyPath(
  properties: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = path.split('.');
  if (parts.length === 1) {
    return { ...properties, [parts[0]]: value };
  }
  const [head, ...rest] = parts;
  const child = (properties[head] as Record<string, unknown> | undefined) ?? {};
  return {
    ...properties,
    [head]: setPropertyPath(child, rest.join('.'), value),
  };
}

export function formatRangeLabel(min: number, max: number, unit: string): string {
  return `${min} – ${max} ${unit}`.trim();
}
