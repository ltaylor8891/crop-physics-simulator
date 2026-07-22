import { ELEMENT_DESCRIPTORS, PLACEABLE_ELEMENT_TYPES } from '../elements/registry';
import { useUiStore } from '../state/uiStore';

/**
 * Left-hand element library (docs/UI_UX_SPECIFICATION.md §Left-Hand Element Library).
 * Clicking an entry enters placement mode; clicking the active entry cancels it.
 */
export function ElementLibrary() {
  const placementType = useUiStore((s) => s.placementType);
  const startPlacement = useUiStore((s) => s.startPlacement);
  const cancelPlacement = useUiStore((s) => s.cancelPlacement);

  return (
    <aside className="panel element-library" aria-label="Element library">
      <h2>Elements</h2>
      <ul>
        {PLACEABLE_ELEMENT_TYPES.map((type) => {
          const descriptor = ELEMENT_DESCRIPTORS[type];
          const active = placementType === type;
          return (
            <li key={type}>
              <button
                type="button"
                className={active ? 'active' : undefined}
                aria-pressed={active}
                title={`Place ${descriptor.label.toLowerCase()} — click a position in the scene`}
                onClick={() => (active ? cancelPlacement() : startPlacement(type))}
              >
                {descriptor.label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        Click an element, then click the ground to place it. Shift-click places repeatedly; Escape
        or right-click cancels.
      </p>
    </aside>
  );
}
