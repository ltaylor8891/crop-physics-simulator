import { create } from 'zustand';
import type { ElementId, ElementType } from '../types/elements';

/** UI-only state: selection, placement mode, view options. */
interface UiState {
  selectedElementId: ElementId | null;
  /** Element type currently being placed, or null when not in placement mode. */
  placementType: ElementType | null;
  gridSnap: boolean;
  select: (id: ElementId | null) => void;
  startPlacement: (type: ElementType) => void;
  cancelPlacement: () => void;
  toggleGridSnap: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedElementId: null,
  placementType: null,
  gridSnap: true,

  select: (id) => set({ selectedElementId: id }),
  startPlacement: (type) => set({ placementType: type, selectedElementId: null }),
  cancelPlacement: () => set({ placementType: null }),
  toggleGridSnap: () => set((state) => ({ gridSnap: !state.gridSnap })),
}));
