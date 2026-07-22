/**
 * Save-format migrations (docs/SAVE_FILE_FORMAT.md §File Version and Migration).
 * Each migrateVnToVn+1 is a pure function; chain runs oldest→newest before schema validation.
 */

import { defaultSpawnerSizeProperties } from '../elements/cropTypes';
import type { CropTypeId } from '../types/elements';
import { CURRENT_FILE_VERSION, type ParseError } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * V1 → V2: add per-spawner size distribution + density defaults.
 */
export function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  const elements = raw.elements;
  if (!Array.isArray(elements)) {
    return { ...raw, fileVersion: 2 };
  }

  const nextElements = elements.map((el) => {
    if (!isRecord(el) || el.type !== 'spawner' || !isRecord(el.properties)) return el;
    const props = el.properties;
    const cropType =
      props.cropType === 'wheatClump' ||
      props.cropType === 'potato' ||
      props.cropType === 'sugarBeet'
        ? (props.cropType as CropTypeId)
        : 'potato';
    const defaults = defaultSpawnerSizeProperties(cropType);
    return {
      ...el,
      properties: {
        ...defaults,
        ...props,
        cropType,
      },
    };
  });

  return { ...raw, fileVersion: 2, elements: nextElements };
}

/**
 * V2 → V3: strip bucket elevators (temporarily removed from the product).
 */
export function migrateV2toV3(raw: Record<string, unknown>): Record<string, unknown> {
  const elements = raw.elements;
  if (!Array.isArray(elements)) {
    return { ...raw, fileVersion: 3 };
  }
  const nextElements = elements.filter((el) => !(isRecord(el) && el.type === 'elevator'));
  return { ...raw, fileVersion: 3, elements: nextElements };
}

/**
 * Apply stepwise migrations until `CURRENT_FILE_VERSION`.
 * Returns the migrated object or errors (e.g. unsupported future version).
 */
export function migrateLayout(
  raw: Record<string, unknown>,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: ParseError[] } {
  const version = raw.fileVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return {
      ok: false,
      errors: [{ path: '/fileVersion', message: 'fileVersion must be an integer' }],
    };
  }
  if (version > CURRENT_FILE_VERSION) {
    return {
      ok: false,
      errors: [
        {
          path: '/fileVersion',
          message: `This layout was saved by a newer version (fileVersion ${version}; app supports ${CURRENT_FILE_VERSION})`,
        },
      ],
    };
  }
  if (version < 1) {
    return {
      ok: false,
      errors: [{ path: '/fileVersion', message: `Unsupported fileVersion ${version}` }],
    };
  }

  let current: Record<string, unknown> = { ...raw };
  let v = version;
  if (v === 1) {
    current = migrateV1toV2(current);
    v = 2;
  }
  if (v === 2) {
    current = migrateV2toV3(current);
    v = 3;
  }

  if (v !== CURRENT_FILE_VERSION) {
    return {
      ok: false,
      errors: [
        {
          path: '/fileVersion',
          message: `Missing migration from fileVersion ${v} to ${CURRENT_FILE_VERSION}`,
        },
      ],
    };
  }

  return { ok: true, value: { ...current, fileVersion: CURRENT_FILE_VERSION } };
}
