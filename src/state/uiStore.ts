import { create } from 'zustand';
import type { ElementId, ElementType } from '../types/elements';

/** UI-only state: selection, placement mode, view options. */
interface UiState {
  selectedElementId: ElementId | null;
  /** Element type currently being placed, or null when not in placement mode. */
  placementType: ElementType | null;
  /** Element being dragged in the viewport; camera controls are suspended while set. */
  draggingElementId: ElementId | null;
  gridSnap: boolean;
  select: (id: ElementId | null) => void;
  startPlacement: (type: ElementType) => void;
  cancelPlacement: () => void;
  setDragging: (id: ElementId | null) => void;
  toggleGridSnap: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedElementId: null,
  placementType: null,
  draggingElementId: null,
  gridSnap: true,

  select: (id) => set({ selectedElementId: id }),
  startPlacement: (type) => set({ placementType: type, selectedElementId: null }),
  cancelPlacement: () => set({ placementType: null }),
  setDragging: (id) => set({ draggingElementId: id }),
  toggleGridSnap: () => set((state) => ({ gridSnap: !state.gridSnap })),
}));
