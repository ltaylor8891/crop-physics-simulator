import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { parseSceneName } from '../../utilities/validation';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  maxLength?: number;
  onCommit: (value: string) => void;
}

/** Editable text that commits on Enter/blur; empty/overlong names revert. */
export function TextField({ id, label, value, maxLength = 64, onCommit }: TextFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const display = draft ?? value;

  const commit = (raw: string) => {
    const result = parseSceneName(raw, value);
    setDraft(null);
    setError(result.error);
    if (result.error === null && result.value !== value) onCommit(result.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      setDraft(null);
      setError(null);
      event.currentTarget.blur();
    }
  };

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        maxLength={maxLength}
        value={display}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onFocus={() => {
          setDraft(value);
          setError(null);
        }}
        onBlur={() => commit(draft ?? value)}
        onKeyDown={onKeyDown}
      />
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
