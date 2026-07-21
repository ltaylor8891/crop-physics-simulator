import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { formatRangeLabel } from '../../elements/propertySchema';
import { parseConstrainedNumber } from '../../utilities/validation';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  /** Display precision while not editing. */
  decimals?: number;
  onCommit: (value: number) => void;
}

/**
 * Commits on Enter/blur. Invalid drafts revert and show the constraint
 * (docs/UI_UX_SPECIFICATION.md §Input Validation).
 */
export function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 2,
  onCommit,
}: NumberFieldProps) {
  const rangeLabel = formatRangeLabel(min, max, unit);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const display = draft ?? formatNumber(value, decimals);

  const commit = (raw: string) => {
    const result = parseConstrainedNumber(raw, { min, max, rangeLabel });
    if (!result.ok) {
      setError(result.error);
      setDraft(null);
      return;
    }
    setError(null);
    setDraft(null);
    if (result.value !== value) onCommit(result.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      setDraft(null);
      setError(null);
      event.currentTarget.blur();
    }
  };

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>
        {label}
        <span className="field-unit">{unit}</span>
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={display}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onFocus={() => {
          setDraft(formatNumber(value, decimals));
          setError(null);
        }}
        onBlur={() => commit(draft ?? formatNumber(value, decimals))}
        onKeyDown={onKeyDown}
      />
      {(draft !== null || error) && (
        <span
          id={error ? `${id}-error` : undefined}
          className={error ? 'field-error' : 'field-hint'}
        >
          {error ?? rangeLabel}
        </span>
      )}
    </div>
  );
}

function formatNumber(value: number, decimals: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}
