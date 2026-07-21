import { useSimulationStore } from '../state/simulationStore';

/** Bottom status bar with live scene statistics (docs/UI_UX_SPECIFICATION.md). */
export function StatusBar() {
  const statistics = useSimulationStore((s) => s.statistics);
  const maxActiveCrops = useSimulationStore((s) => s.settings.maxActiveCrops);
  const spillPercent =
    statistics.totalMassSpawnedKg > 0
      ? (statistics.spilledMassKg / statistics.totalMassSpawnedKg) * 100
      : 0;

  return (
    <footer className="status-bar" aria-label="Scene statistics">
      <span>
        Active crops {statistics.activeCrops}/{maxActiveCrops}
      </span>
      <span>In elevator {statistics.inElevator}</span>
      <span>In {statistics.throughputInTph.toFixed(1)} t/h</span>
      <span>Out {statistics.throughputCollectedTph.toFixed(1)} t/h</span>
      <span>Spilled {spillPercent.toFixed(1)} %</span>
      {statistics.throttled && <span className="status-throttled">THROTTLED</span>}
    </footer>
  );
}
