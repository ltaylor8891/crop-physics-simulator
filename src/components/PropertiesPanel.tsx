import { useSceneStore } from '../state/sceneStore';
import { useUiStore } from '../state/uiStore';

/** Right-hand properties panel (docs/UI_UX_SPECIFICATION.md §Properties Panel). */
export function PropertiesPanel() {
  const selectedElementId = useUiStore((s) => s.selectedElementId);
  const element = useSceneStore((s) =>
    selectedElementId ? s.elements[selectedElementId] : undefined,
  );

  return (
    <aside className="panel properties-panel" aria-label="Properties">
      <h2>Properties</h2>
      {element ? (
        <dl>
          <dt>Name</dt>
          <dd>{element.name}</dd>
          <dt>Type</dt>
          <dd>{element.type}</dd>
        </dl>
      ) : (
        <p className="empty-state">
          Select an element to edit its properties, or choose one from the library to place.
        </p>
      )}
    </aside>
  );
}
