import type { ElementType } from '../types/elements';

interface LibraryEntry {
  type: ElementType;
  label: string;
  /** Placement arrives in Stage 4; entries are visible but disabled until then. */
  available: boolean;
}

const LIBRARY_ENTRIES: LibraryEntry[] = [
  { type: 'conveyor', label: 'Belt conveyor', available: false },
  { type: 'elevator', label: 'Bucket elevator', available: false },
  { type: 'spawner', label: 'Crop spawner', available: false },
  { type: 'collectionZone', label: 'Collection zone', available: false },
  { type: 'despawnZone', label: 'Despawn zone', available: false },
];

/** Left-hand element library (docs/UI_UX_SPECIFICATION.md §Left-Hand Element Library). */
export function ElementLibrary() {
  return (
    <aside className="panel element-library" aria-label="Element library">
      <h2>Elements</h2>
      <ul>
        {LIBRARY_ENTRIES.map((entry) => (
          <li key={entry.type}>
            <button
              type="button"
              disabled={!entry.available}
              title={entry.available ? `Place ${entry.label}` : 'Coming soon (Stage 4)'}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
