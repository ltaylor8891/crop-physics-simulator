/**
 * Numeric input parsing/validation at the UI edge
 * (docs/UI_UX_SPECIFICATION.md §Input Validation).
 * Invalid values revert; the store never receives out-of-range data.
 */

export interface NumberConstraint {
  min: number;
  max: number;
  /** Shown in error text, e.g. "0 – 300 m/min". */
  rangeLabel: string;
}

export type ParseNumberResult = { ok: true; value: number } | { ok: false; error: string };

/**
 * Parse a draft string as a finite number within [min, max].
 * Empty / non-numeric / out-of-range → failure (caller reverts to last valid).
 */
export function parseConstrainedNumber(
  draft: string,
  constraint: NumberConstraint,
): ParseNumberResult {
  const trimmed = draft.trim();
  if (trimmed === '') {
    return { ok: false, error: constraint.rangeLabel };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: constraint.rangeLabel };
  }
  if (value < constraint.min || value > constraint.max) {
    return { ok: false, error: constraint.rangeLabel };
  }
  return { ok: true, value };
}

/** Clamp a known-finite number into range (for programmatic updates, not free-typed input). */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Scene name: 1–64 characters (docs/UI_UX_SPECIFICATION.md). */
export function parseSceneName(
  draft: string,
  previous: string,
): { value: string; error: string | null } {
  const trimmed = draft.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return { value: previous, error: '1 – 64 characters' };
  }
  return { value: trimmed, error: null };
}
