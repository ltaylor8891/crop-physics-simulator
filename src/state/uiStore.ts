import { create } from 'zustand';
import {
  DEFAULT_LAYOUT_CAMERA,
  type LayoutCamera,
} from '../serialization/types';
import type { ElementId, ElementType } from '../types/elements';

/** UI-only state: selection, placement mode, view options, camera snapshot for save. */
interface UiState {
  selectedElementId: ElementId | null;
  /** Element type currently being placed, or null when not in placement mode. */
  placementType: ElementType | null;
  /** Element being dragged in the viewport; camera controls are suspended while set. */
  draggingElementId: ElementId | null;
  gridSnap: boolean;
  /** Orbit camera pose persisted in layout files. */
  camera: LayoutCamera;
  /** Bumped when camera is restored from a file/New so OrbitControls re-applies it. */
  cameraEpoch: number;
  select: (id: ElementId | null) => void;
  startPlacement: (type: ElementType) => void;
  cancelPlacement: () => void;
  setDragging: (id: ElementId | null) => void;
  toggleGridSnap: () => void;
  /** Update pose from OrbitControls (does not bump epoch). */
  setCameraPose: (camera: LayoutCamera) => void;
  /** Restore pose from a loaded file / New (bumps epoch). */
  applyCamera: (camera: LayoutCamera) => void;
  resetCamera: () => void;
}

function cloneCamera(camera: LayoutCamera): LayoutCamera {
  return {
    position: { ...camera.position },
    target: { ...camera.target },
  };
}

export const useUiStore = create<UiState>((set) => ({
  selectedElementId: null,
  placementType: null,
  draggingElementId: null,
  gridSnap: true,
  camera: cloneCamera(DEFAULT_LAYOUT_CAMERA),
  cameraEpoch: 0,

  select: (id) => set({ selectedElementId: id }),
  startPlacement: (type) => set({ placementType: type, selectedElementId: null }),
  cancelPlacement: () => set({ placementType: null }),
  setDragging: (id) => set({ draggingElementId: id }),
  toggleGridSnap: () => set((state) => ({ gridSnap: !state.gridSnap })),
  setCameraPose: (camera) => set({ camera: cloneCamera(camera) }),
  applyCamera: (camera) =>
    set((state) => ({
      camera: cloneCamera(camera),
      cameraEpoch: state.cameraEpoch + 1,
    })),
  resetCamera: () =>
    set((state) => ({
      camera: cloneCamera(DEFAULT_LAYOUT_CAMERA),
      cameraEpoch: state.cameraEpoch + 1,
    })),
}));
