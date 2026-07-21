/**
 * Save-format migrations (docs/SAVE_FILE_FORMAT.md §File Version and Migration).
 * Each migrateVnToVn+1 is a pure function; chain runs oldest→newest before schema validation.
 */

import { CURRENT_FILE_VERSION, type ParseError } from './types';

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

  // V1 is current — no migrations yet. When bumping, chain e.g.:
  // let current = raw; let v = version;
  // if (v === 1) { current = migrateV1toV2(current); v = 2; }
  if (version < CURRENT_FILE_VERSION) {
    return {
      ok: false,
      errors: [
        {
          path: '/fileVersion',
          message: `Missing migration from fileVersion ${version} to ${CURRENT_FILE_VERSION}`,
        },
      ],
    };
  }

  return { ok: true, value: { ...raw, fileVersion: CURRENT_FILE_VERSION } };
}
