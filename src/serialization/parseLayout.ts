/**
 * Parse and validate a layout JSON document (docs/SAVE_FILE_FORMAT.md).
 * Pure — does not touch stores. Callers apply the result atomically.
 */

import { migrateLayout } from './migrations';
import type { LayoutFileV1, ParseError, ParseResult } from './types';
import { validateLayout } from './validateLayout';

/**
 * Accepts a parsed JSON value or a JSON string.
 * Pipeline: parse → fileVersion/migrate → schema validate.
 */
export function parseLayout(input: unknown): ParseResult<LayoutFileV1> {
  let value: unknown = input;

  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return {
        ok: false,
        errors: [{ path: '', message: 'File is not valid JSON' }],
      };
    }
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      errors: [{ path: '', message: 'Layout root must be a JSON object' }],
    };
  }

  const migrated = migrateLayout(value as Record<string, unknown>);
  if (!migrated.ok) return migrated;

  const errors = validateLayout(migrated.value);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: migrated.value as unknown as LayoutFileV1 };
}

/** Format parse errors for the load-failure dialog. */
export function formatParseErrors(errors: ParseError[]): string[] {
  return errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message));
}
