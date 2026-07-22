import { useEffect, useState } from 'react';
import { cropRuntime } from '../simulation/cropRuntime';
import { useSimulationStore } from '../state/simulationStore';

/** Bottom status bar with live scene statistics (docs/UI_UX_SPECIFICATION.md). */
export function StatusBar() {
  const statistics = useSimulationStore((s) => s.statistics);
  const running = useSimulationStore((s) => s.running);
  const maxActiveCrops = useSimulationStore((s) => s.settings.maxActiveCrops);
  const [physicsReady, setPhysicsReady] = useState(() => cropRuntime.isBound);
  const spillPercent =
    statistics.totalMassSpawnedKg > 0
      ? (statistics.spilledMassKg / statistics.totalMassSpawnedKg) * 100
      : 0;

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhysicsReady(cropRuntime.isBound);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer className="status-bar" aria-label="Scene statistics">
      <span>
        Active crops {statistics.activeCrops}/{maxActiveCrops}
      </span>
      <span title="Rolling 10 s window">In {statistics.throughputInTph.toFixed(1)} t/h</span>
      <span title="Rolling 10 s window">Out {statistics.throughputCollectedTph.toFixed(1)} t/h</span>
      <span>Spilled {spillPercent.toFixed(1)} %</span>
      <span title={`Physics step ${statistics.physicsStepMs.toFixed(2)} ms`}>
        {Math.round(statistics.fps)} FPS
      </span>
      {statistics.throttled && <span className="status-throttled">THROTTLED</span>}
      {running && !physicsReady && (
        <span
          className="status-throttled"
          title="Crop physics pools are not bound — crops cannot spawn. If this persists more than a few seconds, check the browser console for Rapier/WASM errors."
        >
          PHYSICS LOADING…
        </span>
      )}
    </footer>
  );
}
