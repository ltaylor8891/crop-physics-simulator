import { useSimulationStore } from '../state/simulationStore';
import { useUiStore } from '../state/uiStore';
import { useSceneStore } from '../state/sceneStore';

/**
 * Top toolbar (docs/UI_UX_SPECIFICATION.md §Top Toolbar). File and simulation
 * actions are placeholders until Stages 8+ and 12 (see docs/ROADMAP.md).
 */
export function Toolbar() {
  const sceneName = useSceneStore((s) => s.sceneName);
  const running = useSimulationStore((s) => s.running);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const gridSnap = useUiStore((s) => s.gridSnap);
  const toggleGridSnap = useUiStore((s) => s.toggleGridSnap);

  return (
    <header className="toolbar">
      <span className="toolbar-title">Crop Physics Simulator</span>
      <span className="toolbar-scene-name" title="Scene name">
        {sceneName}
      </span>

      <div className="toolbar-group" aria-label="File">
        <button type="button" disabled title="Coming in Stage 12 (save/load)">
          New
        </button>
        <button type="button" disabled title="Coming in Stage 12 (save/load)">
          Load
        </button>
        <button type="button" disabled title="Coming in Stage 12 (save/load)">
          Save
        </button>
      </div>

      <div className="toolbar-group" aria-label="Simulation">
        <button
          type="button"
          onClick={() => setRunning(!running)}
          aria-label={running ? 'Pause simulation' : 'Play simulation'}
        >
          {running ? 'Pause' : 'Play'}
        </button>
        <button type="button" disabled title="Coming in Stage 8 (crop spawning)">
          Reset
        </button>
      </div>

      <div className="toolbar-group" aria-label="View">
        <label className="toolbar-toggle">
          <input type="checkbox" checked={gridSnap} onChange={toggleGridSnap} />
          Grid snap
        </label>
      </div>
    </header>
  );
}
