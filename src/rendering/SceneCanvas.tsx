import { Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { useUiStore } from '../state/uiStore';
import { BUILD_AREA_SIZE_M } from '../utilities/snap';
import { PlacedElements } from './PlacedElements';
import { PlacementLayer } from './PlacementLayer';

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
  failed: boolean;
}

/** WebGL-failure fallback (docs/UI_UX_SPECIFICATION.md §Error Messages). */
class CanvasErrorBoundary extends Component<{ children: ReactNode }, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="canvas-fallback" role="alert">
          <h2>3D view unavailable</h2>
          <p>
            The Crop Physics Simulator needs WebGL 2 and WebAssembly. Please use a modern desktop
            browser (Chrome, Edge, Firefox, or Safari 16+) with hardware acceleration enabled.
          </p>
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
        <OrbitControls
          makeDefault
          enabled={!dragging}
          target={[0, 0, 0]}
          minDistance={2}
          maxDistance={150}
          // Keep the camera above ground level (y >= ~0.5 m near the horizon).
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
