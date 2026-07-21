import { create } from 'zustand';
import type { ElementId, SceneElement } from '../types/elements';
import { generateElementId } from '../utilities/ids';

/** Offset applied to duplicated elements so the copy is visible beside the original. */
const DUPLICATE_OFFSET_M = 1;

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Design-time scene description — the single source of truth that rendering
 * and physics are derived from (docs/TECHNICAL_DESIGN.md §State Management).
 * Plain serialisable data only.
 */
interface SceneState {
  sceneName: string;
  /** ISO 8601 UTC; preserved across saves, reset on New. */
  createdAt: string;
  elements: Record<ElementId, SceneElement>;
  addElement: (element: SceneElement) => void;
  updateElement: (id: ElementId, patch: Partial<Omit<SceneElement, 'id' | 'type'>>) => void;
  removeElement: (id: ElementId) => void;
  /** Copy an element with a fresh id, offset by 1 m; returns the new id or null. */
  duplicateElement: (id: ElementId) => ElementId | null;
  setSceneName: (name: string) => void;
  clearScene: () => void;
  replaceScene: (next: {
    sceneName: string;
    createdAt: string;
    elements: Record<ElementId, SceneElement>;
  }) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  sceneName: 'Untitled scene',
  createdAt: nowIso(),
  elements: {},

  addElement: (element) =>
    set((state) => ({ elements: { ...state.elements, [element.id]: element } })),

  updateElement: (id, patch) =>
    set((state) => {
      const existing = state.elements[id];
      if (!existing) return state;
      return {
        elements: { ...state.elements, [id]: { ...existing, ...patch } as SceneElement },
      };
    }),

  removeElement: (id) =>
    set((state) => {
      if (!(id in state.elements)) return state;
      const elements = { ...state.elements };
      delete elements[id];
      return { elements };
    }),

  duplicateElement: (id) => {
    const source = get().elements[id];
    if (!source) return null;
    const copy: SceneElement = {
      ...structuredClone(source),
      id: generateElementId(),
      name: `${source.name} copy`,
      position: {
        ...source.position,
        x: source.position.x + DUPLICATE_OFFSET_M,
        z: source.position.z + DUPLICATE_OFFSET_M,
      },
    };
    set((state) => ({ elements: { ...state.elements, [copy.id]: copy } }));
    return copy.id;
  },

  setSceneName: (name) => set({ sceneName: name }),

  clearScene: () =>
    set({ elements: {}, sceneName: 'Untitled scene', createdAt: nowIso() }),

  replaceScene: (next) =>
    set({
      sceneName: next.sceneName,
      createdAt: next.createdAt,
      elements: next.elements,
    }),
}));
