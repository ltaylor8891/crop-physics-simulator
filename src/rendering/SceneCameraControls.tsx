import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useUiStore } from '../state/uiStore';

/**
 * OrbitControls wired to uiStore camera for save/load round-trip
 * (docs/UI_UX_SPECIFICATION.md §Camera Controls).
 */
export function SceneCameraControls({ enabled }: { enabled: boolean }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const cameraEpoch = useUiStore((s) => s.cameraEpoch);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const pose = useUiStore.getState().camera;
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    controls.update();
  }, [camera, cameraEpoch]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      minDistance={2}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2 - 0.05}
      onEnd={() => {
        const controls = controlsRef.current;
        if (!controls) return;
        useUiStore.getState().setCameraPose({
          position: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
          target: {
            x: controls.target.x,
            y: controls.target.y,
            z: controls.target.z,
          },
        });
      }}
    />
  );
}
