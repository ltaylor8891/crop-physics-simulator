import { create } from 'zustand';
import type { Vec3 } from '../types/elements';
import { generateElementId } from '../utilities/ids';

/**
 * Temporary Stage 6 debug drop-test balls (docs/ROADMAP.md §Stage 6).
 * Not part of the save format; cleared on Reset. Replaced by the crop pool in Stage 8/9.
 */
export interface DebugBall {
  id: string;
  position: Vec3;
}

interface DebugState {
  balls: DebugBall[];
  /** Drop a ball at `position` (typically above a selected conveyor). */
  dropBall: (position: Vec3) => void;
  clearBalls: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  balls: [],
  dropBall: (position) =>
    set((state) => ({
      balls: [...state.balls, { id: generateElementId(), position }],
    })),
  clearBalls: () => set({ balls: [] }),
}));
