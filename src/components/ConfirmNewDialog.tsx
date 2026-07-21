interface ConfirmNewDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirm clearing the scene for New (docs/UI_UX_SPECIFICATION.md). */
export function ConfirmNewDialog({ onConfirm, onCancel }: ConfirmNewDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-dialog"
        role="alertdialog"
        aria-labelledby="confirm-new-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-new-title">Start a new layout?</h2>
        <p>This clears the current scene. Unsaved changes will be lost.</p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="modal-danger" onClick={onConfirm}>
            New layout
          </button>
        </div>
      </div>
    </div>
  );
}
