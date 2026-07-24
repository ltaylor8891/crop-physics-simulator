import { create } from 'zustand';
import type { SimulationSettings } from '../types/settings';
import { DEFAULT_SIMULATION_SETTINGS } from '../types/settings';

/** Live statistics, updated at ~4 Hz by the simulation loop — never per frame. */
export interface SceneStatistics {
  activeCrops: number;
  /** Crops currently in elevator transit queues (hidden from the scene). */
  inElevator: number;
  totalMassSpawnedKg: number;
  /** Rolling 10 s throughput in (t/h). */
  throughputInTph: number;
  /** Rolling 10 s throughput collected, all zones (t/h). */
  throughputCollectedTph: number;
  /** Rolling 10 s collected t/h keyed by collection-zone element id. */
  collectedTphByZoneId: Record<string, number>;
  spilledMassKg: number;
  /** Cumulative mass separated by grading screens (drop-through). */
  gradedMassKg: number;
  throttled: boolean;
  /** Smoothed render FPS. */
  fps: number;
  /** Last physics fixed-step wall time (ms). */
  physicsStepMs: number;
}

const ZERO_STATISTICS: SceneStatistics = {
  activeCrops: 0,
  inElevator: 0,
  totalMassSpawnedKg: 0,
  throughputInTph: 0,
  throughputCollectedTph: 0,
  collectedTphByZoneId: {},
  spilledMassKg: 0,
  gradedMassKg: 0,
  throttled: false,
  fps: 0,
  physicsStepMs: 0,
};

interface SimulationState {
  running: boolean;
  settings: SimulationSettings;
  statistics: SceneStatistics;
  setRunning: (running: boolean) => void;
  updateSettings: (patch: Partial<SimulationSettings>) => void;
  replaceSettings: (settings: SimulationSettings) => void;
  resetToDefaults: () => void;
  setStatistics: (statistics: SceneStatistics) => void;
  patchStatistics: (patch: Partial<SceneStatistics>) => void;
  resetStatistics: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  running: false,
  settings: DEFAULT_SIMULATION_SETTINGS,
  statistics: ZERO_STATISTICS,

  setRunning: (running) => set({ running }),
  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
  replaceSettings: (settings) => set({ settings: { ...settings } }),
  resetToDefaults: () =>
    set({
      running: false,
      settings: { ...DEFAULT_SIMULATION_SETTINGS },
      statistics: ZERO_STATISTICS,
    }),
  setStatistics: (statistics) => set({ statistics }),
  patchStatistics: (patch) => set((state) => ({ statistics: { ...state.statistics, ...patch } })),
  resetStatistics: () => set({ statistics: ZERO_STATISTICS }),
}));
