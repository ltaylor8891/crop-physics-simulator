import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { ELEMENT_DESCRIPTORS, getElementBounds } from '../elements/registry';
import { useSceneStore } from '../state/sceneStore';
import { useUiStore } from '../state/uiStore';
import type { SceneElement } from '../types/elements';
import { clampToBuildArea, snapPositionXZ } from '../utilities/snap';
import { intersectGround } from './groundRay';

const SELECTION_COLOR = '#4f9cf0';
const CLICK_DRAG_TOLERANCE_PX = 4;

interface PointerCaptureTarget {
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
}

/** All placed elements as placeholder boxes (Stage 4; real geometry from Stage 5). */
export function PlacedElements() {
  const elements = useSceneStore((s) => s.elements);
  return (
    <>
      {Object.values(elements).map((element) => (
        <PlacedElement key={element.id} element={element} />
      ))}
    </>
  );
}

function PlacedElement({ element }: { element: SceneElement }) {
  const selected = useUiStore((s) => s.selectedElementId === element.id);
  const descriptor = ELEMENT_DESCRIPTORS[element.type];
  const bounds = getElementBounds(element);
  /** Pointer-to-origin offset captured at drag start so the element doesn't jump. */
  const dragOffsetRef = useRef<{ x: number; z: number } | null>(null);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const ui = useUiStore.getState();
    if (ui.placementType) return; // let placement clicks fall through to the ground
    if (event.button !== 0) return;
    event.stopPropagation();
    ui.select(element.id);

    const ground = intersectGround(event.ray);
    if (!ground) return;
    dragOffsetRef.current = {
      x: element.position.x - ground.x,
      z: element.position.z - ground.z,
    };
    ui.setDragging(element.id);
    (event.target as unknown as PointerCaptureTarget).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const ui = useUiStore.getState();
    if (ui.draggingElementId !== element.id || !dragOffsetRef.current) return;
    event.stopPropagation();

    const ground = intersectGround(event.ray);
    if (!ground) return;
    const snapped = snapPositionXZ(
      {
        x: ground.x + dragOffsetRef.current.x,
        y: element.position.y, // vertical position is never changed by dragging
        z: ground.z + dragOffsetRef.current.z,
      },
      ui.gridSnap,
    );
    const clamped = clampToBuildArea(snapped, bounds.size.x, bounds.size.z, element.rotationYaw);
    useSceneStore.getState().updateElement(element.id, { position: clamped });
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    const ui = useUiStore.getState();
    if (ui.draggingElementId !== element.id) return;
    dragOffsetRef.current = null;
    ui.setDragging(null);
    (event.target as unknown as PointerCaptureTarget).releasePointerCapture(event.pointerId);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (useUiStore.getState().placementType) return;
    if (event.delta > CLICK_DRAG_TOLERANCE_PX) return;
    event.stopPropagation(); // keep the ground's deselect click from firing
    useUiStore.getState().select(element.id);
  };

  return (
    <group
      position={[element.position.x, element.position.y, element.position.z]}
      rotation={[0, element.rotationYaw, 0]}
    >
      <mesh
        position={[bounds.center.x, bounds.center.y, bounds.center.z]}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
      >
        <boxGeometry args={[bounds.size.x, bounds.size.y, bounds.size.z]} />
        <meshStandardMaterial
          color={descriptor.color}
          transparent={descriptor.translucent}
          opacity={descriptor.translucent ? 0.35 : 1}
          emissive={selected ? SELECTION_COLOR : '#000000'}
          emissiveIntensity={selected ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
}
