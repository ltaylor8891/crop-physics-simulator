import { resetCropSimulation } from '../simulation/cropRuntime';
import { useDebugStore } from '../state/debugStore';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import { useUiStore } from '../state/uiStore';
import type { ConveyorElement } from '../types/elements';
import { degreesToRadians } from '../utilities/units';

/**
 * Top toolbar (docs/UI_UX_SPECIFICATION.md §Top Toolbar).
 * "Drop ball" is a temporary Stage 6 debug control (docs/ROADMAP.md §Stage 6).
 */
export function Toolbar() {
  const sceneName = useSceneStore((s) => s.sceneName);
  const running = useSimulationStore((s) => s.running);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const gridSnap = useUiStore((s) => s.gridSnap);
  const toggleGridSnap = useUiStore((s) => s.toggleGridSnap);
  const dropBall = useDebugStore((s) => s.dropBall);
  const clearBalls = useDebugStore((s) => s.clearBalls);

  const handleDropBall = () => {
    dropBall(dropPositionAboveSelection());
    if (!useSimulationStore.getState().running) {
      setRunning(true);
    }
  };

  const handleReset = () => {
    clearBalls();
    resetCropSimulation();
  };

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
        <button
          type="button"
          onClick={handleDropBall}
          title="Drop a test ball onto the selected conveyor (or scene origin)"
        >
          Drop ball
        </button>
        <button type="button" onClick={handleReset} title="Remove crops, debug balls, and clear statistics">
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

/** Spawn a test ball ~0.5 m above the selected conveyor's midpoint (or the origin). */
function dropPositionAboveSelection(): { x: number; y: number; z: number } {
  const selectedId = useUiStore.getState().selectedElementId;
  const element = selectedId ? useSceneStore.getState().elements[selectedId] : undefined;

  if (element?.type === 'conveyor') {
    return dropAboveConveyor(element);
  }

  return { x: 0, y: 3, z: 0 };
}

function dropAboveConveyor(conveyor: ConveyorElement): { x: number; y: number; z: number } {
  const { length, beltHeight, inclineDeg } = conveyor.properties;
  const incline = degreesToRadians(inclineDeg);
  const half = length / 2;
  // Mid-belt top surface in element-local space (same pivot maths as ConveyorMesh).
  const local = {
    x: -half + half * Math.cos(incline),
    y: beltHeight + half * Math.sin(incline) + 0.5,
    z: 0,
  };
  const cos = Math.cos(conveyor.rotationYaw);
  const sin = Math.sin(conveyor.rotationYaw);
  return {
    x: conveyor.position.x + local.x * cos + local.z * sin,
    y: conveyor.position.y + local.y,
    z: conveyor.position.z - local.x * sin + local.z * cos,
  };
}
