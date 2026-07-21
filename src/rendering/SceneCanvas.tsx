import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { useUiStore } from '../state/uiStore';
import { BUILD_AREA_SIZE_M } from '../utilities/snap';
import { PlacedElements } from './PlacedElements';
import { PlacementLayer } from './PlacementLayer';
import { SceneCameraControls } from './SceneCameraControls';

/** Initial camera pose (docs/UI_UX_SPECIFICATION.md §Camera Controls). */
const INITIAL_CAMERA_POSITION: [number, number, number] = [18, 14, 18];

function Ground() {
  // Visuals only — pointer interaction happens on PlacementLayer's plane,
  // so both meshes opt out of raycasting.
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        raycast={() => null}
      >
        <planeGeometry args={[BUILD_AREA_SIZE_M, BUILD_AREA_SIZE_M]} />
        <meshStandardMaterial color="#2b2f33" />
      </mesh>
      {/* 1 world unit = 1 m: minor lines every 1 m, majors every 5 m (ADR-003). */}
      <Grid
        args={[BUILD_AREA_SIZE_M, BUILD_AREA_SIZE_M]}
        cellSize={1}
        cellColor="#3d4349"
        sectionSize={5}
        sectionColor="#556069"
        fadeDistance={90}
        fadeStrength={1}
        followCamera={false}
        raycast={() => null}
      />
    </>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 10]} intensity={1.2} castShadow />
    </>
  );
}

interface CanvasErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render failures inside the canvas (WebGL, Rapier, React loops, etc.).
 * Shows the real error message so a coding bug is not mistaken for missing WebGL.
 */
class CanvasErrorBoundary extends Component<{ children: ReactNode }, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('3D viewport crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="canvas-fallback" role="alert">
          <h2>3D view unavailable</h2>
          <p>
            The viewport hit an error. If this persists on a modern desktop browser with hardware
            acceleration, report the message below.
          </p>
          <pre className="canvas-fallback-error">{this.state.error.message}</pre>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SceneCanvas() {
  // Camera dragging is suspended while an element is being dragged.
  const dragging = useUiStore((s) => s.draggingElementId !== null);

  return (
    <CanvasErrorBoundary>
      <Canvas
        shadows
        camera={{ position: INITIAL_CAMERA_POSITION, fov: 50 }}
        aria-label="3D scene viewport"
      >
        <color attach="background" args={['#1a1d20']} />
        <Lighting />
        <Ground />
        <PlacementLayer />
        <PlacedElements />
        {/* Rapier WASM loads via suspend-react; Suspense keeps the canvas up while it inits. */}
        <Suspense fallback={null}>
          <PhysicsWorld />
        </Suspense>
        <SceneCameraControls enabled={!dragging} />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
