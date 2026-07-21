import { useRef, useState } from 'react';
import {
  createNewLayout,
  downloadCurrentLayout,
  loadLayoutFile,
} from '../serialization/layoutActions';
import type { ParseError } from '../serialization/types';
import { resetCropSimulation } from '../simulation/cropRuntime';
import { useDebugStore } from '../state/debugStore';
import { useSceneStore } from '../state/sceneStore';
import { useSimulationStore } from '../state/simulationStore';
import { useUiStore } from '../state/uiStore';
import type { ConveyorElement } from '../types/elements';
import { degreesToRadians } from '../utilities/units';
import { ConfirmNewDialog } from './ConfirmNewDialog';
import { LoadErrorDialog } from './LoadErrorDialog';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadErrors, setLoadErrors] = useState<ParseError[] | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);

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

  const requestNew = () => {
    const hasElements = Object.keys(useSceneStore.getState().elements).length > 0;
    if (hasElements) setConfirmNew(true);
    else createNewLayout();
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const errors = await loadLayoutFile(file);
    if (errors) setLoadErrors(errors);
  };

  return (
    <header className="toolbar">
      <span className="toolbar-title">Crop Physics Simulator</span>
      <span className="toolbar-scene-name" title="Scene name">
        {sceneName}
      </span>

      <div className="toolbar-group" aria-label="File">
        <button type="button" onClick={requestNew} title="Clear the scene (New)">
          New
        </button>
        <button type="button" onClick={openFilePicker} title="Load a layout JSON file (Ctrl+O)">
          Load
        </button>
        <button
          type="button"
          onClick={() => downloadCurrentLayout()}
          title="Download layout JSON (Ctrl+S)"
        >
          Save
        </button>
        <input
          id="layout-file-input"
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            void onFileChosen(event);
          }}
        />
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
        <button
          type="button"
          onClick={handleReset}
          title="Remove crops, debug balls, and clear statistics"
        >
          Reset
        </button>
      </div>

      <div className="toolbar-group" aria-label="View">
        <label className="toolbar-toggle">
          <input type="checkbox" checked={gridSnap} onChange={toggleGridSnap} />
          Grid snap
        </label>
      </div>

      {confirmNew && (
        <ConfirmNewDialog
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false);
            createNewLayout();
          }}
        />
      )}
      {loadErrors && (
        <LoadErrorDialog errors={loadErrors} onClose={() => setLoadErrors(null)} />
      )}
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
