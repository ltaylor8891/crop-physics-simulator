import { create } from 'zustand';
import type { ElementId, SceneElement } from '../types/elements';

/**
 * Design-time scene description — the single source of truth that rendering
 * and physics are derived from (docs/TECHNICAL_DESIGN.md §State Management).
 * Plain serialisable data only.
 */
interface SceneState {
  sceneName: string;
  elements: Record<ElementId, SceneElement>;
  addElement: (element: SceneElement) => void;
  updateElement: (id: ElementId, patch: Partial<Omit<SceneElement, 'id' | 'type'>>) => void;
  removeElement: (id: ElementId) => void;
  setSceneName: (name: string) => void;
  clearScene: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  sceneName: 'Untitled scene',
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

  setSceneName: (name) => set({ sceneName: name }),

  clearScene: () => set({ elements: {}, sceneName: 'Untitled scene' }),
}));
