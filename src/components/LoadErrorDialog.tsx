import type { ParseError } from '../serialization/types';

interface LoadErrorDialogProps {
  errors: ParseError[];
  onClose: () => void;
}

/** Load-failure modal (docs/UI_UX_SPECIFICATION.md §Load failure). */
export function LoadErrorDialog({ errors, onClose }: LoadErrorDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-dialog"
        role="alertdialog"
        aria-labelledby="load-error-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="load-error-title">Couldn&apos;t load layout</h2>
        <p>The current scene was left unchanged.</p>
        <ul className="modal-error-list">
          {errors.map((error) => (
            <li key={`${error.path}:${error.message}`}>
              {error.path ? (
                <>
                  <code>{error.path}</code>: {error.message}
                </>
              ) : (
                error.message
              )}
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
