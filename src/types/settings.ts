/** Scene-wide simulation settings, saved with the layout (docs/SAVE_FILE_FORMAT.md). */
export interface SimulationSettings {
  /** m/s², downward (0–20) */
  gravity: number;
  /** hard cap on pooled crop bodies (100–5000) */
  maxActiveCrops: number;
  /** seconds from first floor contact to despawn (0.5–30) */
  floorDespawnSeconds: number;
}

export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  gravity: 9.81,
  maxActiveCrops: 2000,
  floorDespawnSeconds: 3,
};
