import { ELEMENT_DESCRIPTORS } from '../elements/registry';
import { useSceneStore } from '../state/sceneStore';
import { useUiStore } from '../state/uiStore';
import { radiansToDegrees } from '../utilities/units';

/**
 * Right-hand properties panel (docs/UI_UX_SPECIFICATION.md §Properties Panel).
 * Stage 4 shows a read-only summary plus duplicate/delete; editable
 * type-specific fields arrive with the properties editor (Stage 7).
 */
export function PropertiesPanel() {
  const selectedElementId = useUiStore((s) => s.selectedElementId);
  const select = useUiStore((s) => s.select);
  const element = useSceneStore((s) =>
    selectedElementId ? s.elements[selectedElementId] : undefined,
  );
  const duplicateElement = useSceneStore((s) => s.duplicateElement);
  const removeElement = useSceneStore((s) => s.removeElement);

  if (!element) {
    return (
      <aside className="panel properties-panel" aria-label="Properties">
        <h2>Properties</h2>
        <p className="empty-state">
          Select an element to edit its properties, or choose one from the library to place.
        </p>
      </aside>
    );
  }

  const { position } = element;

  return (
    <aside className="panel properties-panel" aria-label="Properties">
      <h2>Properties</h2>
      <dl>
        <dt>Name</dt>
        <dd>{element.name}</dd>
        <dt>Type</dt>
        <dd>{ELEMENT_DESCRIPTORS[element.type].label}</dd>
        <dt>Position</dt>
        <dd>
          x {position.x.toFixed(2)} m · y {position.y.toFixed(2)} m · z {position.z.toFixed(2)} m
        </dd>
        <dt>Rotation</dt>
        <dd>{radiansToDegrees(element.rotationYaw).toFixed(0)}°</dd>
      </dl>
      <p className="hint">
        Drag to move, R / Shift+R to rotate. Numeric editing arrives with the properties editor
        (Stage 7).
      </p>
      <div className="panel-actions">
        <button
          type="button"
          onClick={() => {
            const copyId = duplicateElement(element.id);
            if (copyId) select(copyId);
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => {
            removeElement(element.id);
            select(null);
          }}
        >
          Delete
        </button>
      </div>
    </aside>
  );
}
