import { create } from 'zustand';
import type { SimulationSettings } from '../types/settings';
import { DEFAULT_SIMULATION_SETTINGS } from '../types/settings';

/** Live statistics, updated at ~4 Hz by the simulation loop — never per frame. */
export interface SceneStatistics {
  activeCrops: number;
  totalMassSpawnedKg: number;
  throughputInTph: number;
  throughputCollectedTph: number;
  spilledMassKg: number;
  throttled: boolean;
}

const ZERO_STATISTICS: SceneStatistics = {
  activeCrops: 0,
  totalMassSpawnedKg: 0,
  throughputInTph: 0,
  throughputCollectedTph: 0,
  spilledMassKg: 0,
  throttled: false,
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
  resetStatistics: () => set({ statistics: ZERO_STATISTICS }),
}));
